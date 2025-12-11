// path: apps/api/src/routes/developer.ts
// BazariOS Developer Portal API

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient, Prisma, DeveloperAppStatus } from '@prisma/client';
import { z } from 'zod';
import crypto from 'crypto';
import { authOnRequest } from '../lib/auth/middleware.js';
import { uploadToIpfs } from '../lib/ipfs.js';
import jwt from 'jsonwebtoken';
import { authConfig } from '../config/auth.js';

// ============================================
// SDK API KEY SCHEMAS
// ============================================

const createSdkAppSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  websiteUrl: z.string().url().optional(),
  allowedOrigins: z.array(z.string().url()).min(1).max(10),
  permissions: z.array(z.enum([
    'user:read',
    'wallet:read',
    'wallet:transfer',
    'storage:read',
    'storage:write',
    'ui:toast',
    'ui:modal',
    'contracts:read',
    'contracts:deploy',
    'contracts:execute',
  ])).optional(),
});

const updateSdkAppSchema = createSdkAppSchema.partial();

/**
 * Gera API Key segura
 * Formato: baz_app_XXXXXXXXXX ou baz_test_XXXXXXXXXX
 */
function generateApiKey(isTest = false): string {
  const prefix = isTest ? 'baz_test_' : 'baz_app_';
  const randomPart = crypto.randomBytes(24).toString('base64url');
  return `${prefix}${randomPart}`;
}

/**
 * Gera Secret Key segura para HMAC signing
 */
function generateSecretKey(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Hash da secret key para armazenamento seguro
 */
function hashSecretKey(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

/**
 * Gera slug único a partir do nome
 */
function generateSlug(name: string, suffix: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30);
  return `${base}-${suffix}`;
}

const createAppSchema = z.object({
  appId: z.string().min(3).regex(/^[a-z][a-z0-9.-]*$/i, 'App ID must start with a letter and contain only letters, numbers, dots, and hyphens'),
  name: z.string().min(1).max(50),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase'),
  description: z.string().min(10).max(500),
  longDescription: z.string().max(5000).optional(),
  category: z.enum(['finance', 'social', 'commerce', 'tools', 'governance', 'entertainment']),
  tags: z.array(z.string()).max(10).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(100).optional(),
  screenshots: z.array(z.string().url()).max(5).optional(),
  permissions: z.array(z.object({
    id: z.string(),
    reason: z.string(),
    optional: z.boolean().optional(),
  })).optional(),
  sdkVersion: z.string().optional(),
  // Monetization fields
  monetizationType: z.enum(['FREE', 'PAID', 'FREEMIUM', 'SUBSCRIPTION']).optional(),
  price: z.string().regex(/^\d+\.?\d*$/, 'Invalid price format').optional().nullable(),
});

const updateAppSchema = createAppSchema.partial().omit({ appId: true, slug: true });

const submitVersionSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be semver'),
  changelog: z.string().max(2000).optional(),
  bundleUrl: z.string().url(),
  bundleHash: z.string().min(32),
  notes: z.string().max(1000).optional(),
});

export async function developerRoutes(
  app: FastifyInstance,
  options: FastifyPluginOptions & { prisma: PrismaClient }
) {
  const { prisma } = options;

  // GET /developer/apps - Listar apps do desenvolvedor
  app.get('/developer/apps', {
    onRequest: authOnRequest,
  }, async (request, reply) => {
    const userId = (request as any).authUser?.sub;

    app.log.info({ userId }, 'GET /developer/apps - fetching apps for user');

    const apps = await prisma.thirdPartyApp.findMany({
      where: { developerId: userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { reviews: true, versions: true },
        },
      },
    });

    app.log.info({ userId, appsCount: apps.length, appIds: apps.map(a => a.id) }, 'GET /developer/apps - found apps');

    return { apps };
  });

  // GET /developer/apps/:id - Detalhes de um app
  app.get('/developer/apps/:id', {
    onRequest: authOnRequest,
  }, async (request, reply) => {
    const userId = (request as any).authUser?.sub;
    const { id: appId } = request.params as { id: string };

    const appData = await prisma.thirdPartyApp.findFirst({
      where: { id: appId, developerId: userId },
      include: {
        versions: { orderBy: { createdAt: 'desc' }, take: 10 },
        submissions: { orderBy: { submittedAt: 'desc' }, take: 5 },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            user: {
              select: {
                id: true,
                profile: {
                  select: { handle: true, avatarUrl: true },
                },
              },
            },
          },
        },
      },
    });

    if (!appData) {
      return reply.status(404).send({ error: 'App not found' });
    }

    return { app: appData };
  });

  // POST /developer/apps - Criar novo app
  app.post('/developer/apps', {
    onRequest: authOnRequest,
  }, async (request, reply) => {
    const userId = (request as any).authUser?.sub;

    // Debug: Log request body
    app.log.info({ body: request.body, userId }, 'POST /developer/apps - received body');

    const validation = createAppSchema.safeParse(request.body);
    if (!validation.success) {
      app.log.warn({ errors: validation.error.flatten() }, 'POST /developer/apps - validation failed');
      return reply.status(400).send({
        error: 'Validation failed',
        details: validation.error.flatten()
      });
    }

    const body = validation.data;

    // Verificar se slug já existe
    const existingSlug = await prisma.thirdPartyApp.findUnique({
      where: { slug: body.slug },
    });

    if (existingSlug) {
      return reply.status(400).send({ error: 'Slug já está em uso' });
    }

    // Verificar se appId já existe
    const existingAppId = await prisma.thirdPartyApp.findUnique({
      where: { appId: body.appId },
    });

    if (existingAppId) {
      return reply.status(400).send({ error: 'App ID já está em uso' });
    }

    const appData = await prisma.thirdPartyApp.create({
      data: {
        appId: body.appId,
        name: body.name,
        slug: body.slug,
        developerId: userId,
        description: body.description,
        longDescription: body.longDescription || null,
        category: body.category,
        tags: body.tags || [],
        icon: body.icon || 'Package',
        color: body.color || 'from-gray-500 to-gray-600',
        screenshots: body.screenshots || [],
        currentVersion: '0.1.0',
        sdkVersion: body.sdkVersion || '0.1.0',
        bundleUrl: '',
        bundleHash: '',
        permissions: body.permissions || [],
        status: 'DRAFT',
      },
    });

    return reply.status(201).send({ app: appData });
  });

  // PUT /developer/apps/:id - Atualizar app
  app.put('/developer/apps/:id', {
    onRequest: authOnRequest,
  }, async (request, reply) => {
    const userId = (request as any).authUser?.sub;
    const { id: appId } = request.params as { id: string };

    const validation = updateAppSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: validation.error.flatten()
      });
    }

    const body = validation.data;

    const existing = await prisma.thirdPartyApp.findFirst({
      where: { id: appId, developerId: userId },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'App not found' });
    }

    const appData = await prisma.thirdPartyApp.update({
      where: { id: appId },
      data: {
        name: body.name ?? existing.name,
        description: body.description ?? existing.description,
        longDescription: body.longDescription,
        category: body.category ?? existing.category,
        tags: body.tags ?? existing.tags,
        icon: body.icon ?? existing.icon,
        color: body.color ?? existing.color,
        screenshots: body.screenshots ?? existing.screenshots,
        permissions: body.permissions ?? (existing.permissions as object[] || []),
        // Monetization fields
        monetizationType: body.monetizationType ?? existing.monetizationType,
        price: body.price !== undefined
          ? (body.price ? new Prisma.Decimal(body.price) : null)
          : existing.price,
      },
    });

    return { app: appData };
  });

  // DELETE /developer/apps/:id - Deletar app (apenas em DRAFT)
  app.delete('/developer/apps/:id', {
    onRequest: authOnRequest,
  }, async (request, reply) => {
    const userId = (request as any).authUser?.sub;
    const { id: appId } = request.params as { id: string };

    const existing = await prisma.thirdPartyApp.findFirst({
      where: { id: appId, developerId: userId },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'App not found' });
    }

    if (existing.status !== 'DRAFT') {
      return reply.status(400).send({
        error: 'Apenas apps em DRAFT podem ser deletados'
      });
    }

    await prisma.thirdPartyApp.delete({
      where: { id: appId },
    });

    return { success: true };
  });

  // POST /developer/apps/:id/submit - Submeter para review
  app.post('/developer/apps/:id/submit', {
    onRequest: authOnRequest,
  }, async (request, reply) => {
    const userId = (request as any).authUser?.sub;
    const { id: appId } = request.params as { id: string };

    const validation = submitVersionSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: validation.error.flatten()
      });
    }

    const body = validation.data;

    const appData = await prisma.thirdPartyApp.findFirst({
      where: { id: appId, developerId: userId },
    });

    if (!appData) {
      return reply.status(404).send({ error: 'App not found' });
    }

    // Criar versão
    const version = await prisma.appVersion.create({
      data: {
        appId: appData.id,
        version: body.version,
        changelog: body.changelog || null,
        bundleUrl: body.bundleUrl,
        bundleHash: body.bundleHash,
      },
    });

    // Criar submissão
    const submission = await prisma.appSubmission.create({
      data: {
        appId: appData.id,
        version: body.version,
        notes: body.notes || null,
      },
    });

    // Atualizar status do app
    await prisma.thirdPartyApp.update({
      where: { id: appData.id },
      data: {
        status: 'PENDING_REVIEW',
        bundleUrl: body.bundleUrl,
        bundleHash: body.bundleHash,
        currentVersion: body.version,
      },
    });

    return reply.status(201).send({ version, submission });
  });

  // GET /developer/apps/:id/analytics - Analytics do app
  app.get('/developer/apps/:id/analytics', {
    onRequest: authOnRequest,
  }, async (request, reply) => {
    const userId = (request as any).authUser?.sub;
    const { id: appId } = request.params as { id: string };

    const appData = await prisma.thirdPartyApp.findFirst({
      where: { id: appId, developerId: userId },
    });

    if (!appData) {
      return reply.status(404).send({ error: 'App not found' });
    }

    const analytics = {
      installs: {
        total: appData.installCount,
        last7Days: Math.floor(appData.installCount * 0.1),
        last30Days: Math.floor(appData.installCount * 0.3),
      },
      rating: {
        average: appData.rating || 0,
        count: appData.ratingCount,
      },
      retention: {
        day1: 0.8,
        day7: 0.4,
        day30: 0.2,
      },
      events: {
        opens: appData.installCount * 5,
        sessions: appData.installCount * 3,
      },
    };

    return { analytics };
  });

  // GET /developer/apps/:id/monetization - Configurações de monetização
  app.get('/developer/apps/:id/monetization', {
    onRequest: authOnRequest,
  }, async (request, reply) => {
    const userId = (request as any).authUser?.sub;
    const { id: appId } = request.params as { id: string };

    const appData = await prisma.thirdPartyApp.findFirst({
      where: { id: appId, developerId: userId },
      include: {
        inAppPurchases: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!appData) {
      return reply.status(404).send({ error: 'App not found' });
    }

    return {
      id: appData.id,
      name: appData.name,
      monetizationType: appData.monetizationType,
      price: appData.price?.toString() || null,
      inAppPurchases: appData.inAppPurchases.map((iap) => ({
        id: iap.id,
        productId: iap.productId,
        name: iap.name,
        description: iap.description,
        price: iap.price.toString(),
        type: iap.type,
        isActive: true, // TODO: add isActive field to schema
      })),
      totalRevenue: appData.totalRevenue?.toString() || '0',
      developerRevenue: appData.developerRevenue?.toString() || '0',
      platformRevenue: appData.platformRevenue?.toString() || '0',
      installCount: appData.installCount,
    };
  });

  // PUT /developer/apps/:id/monetization - Atualizar configurações de monetização
  app.put('/developer/apps/:id/monetization', {
    onRequest: authOnRequest,
  }, async (request, reply) => {
    const userId = (request as any).authUser?.sub;
    const { id: appId } = request.params as { id: string };
    const body = request.body as { monetizationType: string; price: string | null };

    const existing = await prisma.thirdPartyApp.findFirst({
      where: { id: appId, developerId: userId },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'App not found' });
    }

    const appData = await prisma.thirdPartyApp.update({
      where: { id: appId },
      data: {
        monetizationType: body.monetizationType as any,
        price: body.price ? new Prisma.Decimal(body.price) : null,
      },
    });

    return { success: true, monetizationType: appData.monetizationType, price: appData.price?.toString() };
  });

  // POST /developer/apps/:id/iap - Criar In-App Purchase
  app.post('/developer/apps/:id/iap', {
    onRequest: authOnRequest,
  }, async (request, reply) => {
    const userId = (request as any).authUser?.sub;
    const { id: appId } = request.params as { id: string };
    const body = request.body as {
      productId: string;
      name: string;
      description: string;
      price: string;
      type: string;
    };

    const existing = await prisma.thirdPartyApp.findFirst({
      where: { id: appId, developerId: userId },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'App not found' });
    }

    // Check if productId already exists for this app
    const existingIap = await prisma.inAppPurchase.findFirst({
      where: { appId, productId: body.productId },
    });

    if (existingIap) {
      return reply.status(400).send({ error: 'Product ID already exists' });
    }

    const iap = await prisma.inAppPurchase.create({
      data: {
        appId,
        productId: body.productId,
        name: body.name,
        description: body.description || '',
        price: new Prisma.Decimal(body.price),
        type: body.type as any,
      },
    });

    return reply.status(201).send({ iap });
  });

  // PUT /developer/apps/:id/iap/:iapId - Atualizar In-App Purchase
  app.put('/developer/apps/:id/iap/:iapId', {
    onRequest: authOnRequest,
  }, async (request, reply) => {
    const userId = (request as any).authUser?.sub;
    const { id: appId, iapId } = request.params as { id: string; iapId: string };
    const body = request.body as {
      name?: string;
      description?: string;
      price?: string;
      type?: string;
    };

    const appData = await prisma.thirdPartyApp.findFirst({
      where: { id: appId, developerId: userId },
    });

    if (!appData) {
      return reply.status(404).send({ error: 'App not found' });
    }

    const iap = await prisma.inAppPurchase.findFirst({
      where: { id: iapId, appId },
    });

    if (!iap) {
      return reply.status(404).send({ error: 'IAP not found' });
    }

    const updated = await prisma.inAppPurchase.update({
      where: { id: iapId },
      data: {
        name: body.name ?? iap.name,
        description: body.description ?? iap.description,
        price: body.price ? new Prisma.Decimal(body.price) : iap.price,
        type: body.type ? (body.type as any) : iap.type,
      },
    });

    return { iap: updated };
  });

  // DELETE /developer/apps/:id/iap/:iapId - Deletar In-App Purchase
  app.delete('/developer/apps/:id/iap/:iapId', {
    onRequest: authOnRequest,
  }, async (request, reply) => {
    const userId = (request as any).authUser?.sub;
    const { id: appId, iapId } = request.params as { id: string; iapId: string };

    const appData = await prisma.thirdPartyApp.findFirst({
      where: { id: appId, developerId: userId },
    });

    if (!appData) {
      return reply.status(404).send({ error: 'App not found' });
    }

    const iap = await prisma.inAppPurchase.findFirst({
      where: { id: iapId, appId },
    });

    if (!iap) {
      return reply.status(404).send({ error: 'IAP not found' });
    }

    await prisma.inAppPurchase.delete({
      where: { id: iapId },
    });

    return { success: true };
  });

  // POST /developer/apps/:id/bundle - Upload bundle para IPFS
  app.post('/developer/apps/:id/bundle', {
    onRequest: authOnRequest,
  }, async (request, reply) => {
    const userId = (request as any).authUser?.sub;
    const { id: appId } = request.params as { id: string };

    // Verificar se app pertence ao desenvolvedor
    const appData = await prisma.thirdPartyApp.findFirst({
      where: { id: appId, developerId: userId },
    });

    if (!appData) {
      return reply.status(404).send({ error: 'App not found' });
    }

    // Processar multipart
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    // Ler arquivo em buffer
    const chunks: Buffer[] = [];
    for await (const chunk of data.file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Validar tamanho (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (buffer.length > MAX_SIZE) {
      return reply.status(400).send({ error: 'Bundle too large (max 10MB)' });
    }

    // Calcular hash SHA256
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    try {
      // Upload para IPFS
      const cid = await uploadToIpfs(buffer, {
        filename: `${appData.appId}-${Date.now()}.tar.gz`,
      });

      app.log.info({ appId, cid, size: buffer.length, hash }, 'Bundle uploaded to IPFS');

      return {
        success: true,
        cid,
        bundleUrl: `ipfs://${cid}`,
        hash,
        size: buffer.length,
      };
    } catch (error) {
      app.log.error({ appId, error }, 'Failed to upload bundle to IPFS');
      return reply.status(500).send({ error: 'Failed to upload to IPFS' });
    }
  });

  // ============================================
  // SDK API KEY ROUTES (DeveloperApp model)
  // ============================================

  // GET /developer/sdk-apps - Listar API keys do desenvolvedor
  app.get('/developer/sdk-apps', {
    onRequest: authOnRequest,
  }, async (request, reply) => {
    const userId = (request as any).authUser?.sub;

    // Buscar profile do usuário
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Profile not found' });
    }

    const sdkApps = await prisma.developerApp.findMany({
      where: { developerId: profile.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        websiteUrl: true,
        apiKey: true, // Mostrar API key (necessário para o desenvolvedor usar)
        allowedOrigins: true,
        permissions: true,
        status: true,
        reviewNotes: true,
        totalRequests: true,
        lastRequestAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Convert BigInt to string for JSON serialization
    const apps = sdkApps.map(app => ({
      ...app,
      totalRequests: app.totalRequests.toString(),
    }));

    return { apps };
  });

  // POST /developer/sdk-apps - Criar nova API key
  app.post('/developer/sdk-apps', {
    onRequest: authOnRequest,
  }, async (request, reply) => {
    const userId = (request as any).authUser?.sub;

    const validation = createSdkAppSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: validation.error.flatten()
      });
    }

    const body = validation.data;

    // Buscar profile do usuário
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Profile not found' });
    }

    // Verificar limite de apps (max 10 por desenvolvedor)
    const appCount = await prisma.developerApp.count({
      where: { developerId: profile.id },
    });

    if (appCount >= 10) {
      return reply.status(400).send({
        error: 'Maximum of 10 SDK apps allowed per developer'
      });
    }

    // Gerar credenciais
    const apiKey = generateApiKey(false);
    const secretKey = generateSecretKey();
    const secretKeyHash = hashSecretKey(secretKey);

    // Gerar slug único
    const slugSuffix = crypto.randomBytes(4).toString('hex');
    const slug = generateSlug(body.name, slugSuffix);

    // Criar app
    const sdkApp = await prisma.developerApp.create({
      data: {
        developerId: profile.id,
        name: body.name,
        slug,
        description: body.description || null,
        websiteUrl: body.websiteUrl || null,
        apiKey,
        secretKeyHash,
        allowedOrigins: body.allowedOrigins,
        permissions: body.permissions || ['user:read', 'wallet:read'],
        status: 'APPROVED', // Auto-aprovar por enquanto
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        websiteUrl: true,
        apiKey: true,
        allowedOrigins: true,
        permissions: true,
        status: true,
        createdAt: true,
      },
    });

    // Retornar com secretKey (ÚNICA VEZ que será mostrada!)
    return reply.status(201).send({
      app: sdkApp,
      secretKey, // IMPORTANTE: Mostrar apenas na criação!
      warning: 'Save the secretKey securely. It will NOT be shown again!',
    });
  });

  // GET /developer/sdk-apps/:id - Detalhes de um SDK app
  app.get('/developer/sdk-apps/:id', {
    onRequest: authOnRequest,
  }, async (request, reply) => {
    const userId = (request as any).authUser?.sub;
    const { id } = request.params as { id: string };

    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Profile not found' });
    }

    const sdkApp = await prisma.developerApp.findFirst({
      where: { id, developerId: profile.id },
      include: {
        usageLogs: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!sdkApp) {
      return reply.status(404).send({ error: 'SDK app not found' });
    }

    // Estatísticas de uso
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [requests24h, requests7d, errorRate] = await Promise.all([
      prisma.developerAppUsageLog.count({
        where: { appId: id, createdAt: { gte: last24h } },
      }),
      prisma.developerAppUsageLog.count({
        where: { appId: id, createdAt: { gte: last7d } },
      }),
      prisma.developerAppUsageLog.count({
        where: { appId: id, success: false, createdAt: { gte: last7d } },
      }),
    ]);

    return {
      app: {
        id: sdkApp.id,
        name: sdkApp.name,
        slug: sdkApp.slug,
        description: sdkApp.description,
        websiteUrl: sdkApp.websiteUrl,
        apiKey: sdkApp.apiKey,
        allowedOrigins: sdkApp.allowedOrigins,
        permissions: sdkApp.permissions,
        status: sdkApp.status,
        reviewNotes: sdkApp.reviewNotes,
        rateLimitCapacity: sdkApp.rateLimitCapacity,
        rateLimitRefillRate: sdkApp.rateLimitRefillRate,
        totalRequests: sdkApp.totalRequests.toString(),
        lastRequestAt: sdkApp.lastRequestAt,
        createdAt: sdkApp.createdAt,
        updatedAt: sdkApp.updatedAt,
      },
      stats: {
        requests24h,
        requests7d,
        errorRate: requests7d > 0 ? (errorRate / requests7d * 100).toFixed(2) : '0',
      },
      recentLogs: sdkApp.usageLogs.map(log => ({
        id: log.id,
        messageType: log.messageType,
        success: log.success,
        errorCode: log.errorCode,
        origin: log.origin,
        responseTimeMs: log.responseTimeMs,
        createdAt: log.createdAt,
      })),
    };
  });

  // PUT /developer/sdk-apps/:id - Atualizar SDK app
  app.put('/developer/sdk-apps/:id', {
    onRequest: authOnRequest,
  }, async (request, reply) => {
    const userId = (request as any).authUser?.sub;
    const { id } = request.params as { id: string };

    const validation = updateSdkAppSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: validation.error.flatten()
      });
    }

    const body = validation.data;

    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Profile not found' });
    }

    const existing = await prisma.developerApp.findFirst({
      where: { id, developerId: profile.id },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'SDK app not found' });
    }

    const sdkApp = await prisma.developerApp.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        description: body.description,
        websiteUrl: body.websiteUrl,
        allowedOrigins: body.allowedOrigins ?? existing.allowedOrigins,
        permissions: body.permissions ?? existing.permissions,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        websiteUrl: true,
        apiKey: true,
        allowedOrigins: true,
        permissions: true,
        status: true,
        updatedAt: true,
      },
    });

    return { app: sdkApp };
  });

  // DELETE /developer/sdk-apps/:id - Revogar API key
  app.delete('/developer/sdk-apps/:id', {
    onRequest: authOnRequest,
  }, async (request, reply) => {
    const userId = (request as any).authUser?.sub;
    const { id } = request.params as { id: string };

    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Profile not found' });
    }

    const existing = await prisma.developerApp.findFirst({
      where: { id, developerId: profile.id },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'SDK app not found' });
    }

    await prisma.developerApp.delete({
      where: { id },
    });

    return { success: true, message: 'API key revoked' };
  });

  // POST /developer/sdk-apps/:id/rotate-secret - Rotacionar secret key
  app.post('/developer/sdk-apps/:id/rotate-secret', {
    onRequest: authOnRequest,
  }, async (request, reply) => {
    const userId = (request as any).authUser?.sub;
    const { id } = request.params as { id: string };

    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Profile not found' });
    }

    const existing = await prisma.developerApp.findFirst({
      where: { id, developerId: profile.id },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'SDK app not found' });
    }

    // Gerar nova secret key
    const newSecretKey = generateSecretKey();
    const newSecretKeyHash = hashSecretKey(newSecretKey);

    await prisma.developerApp.update({
      where: { id },
      data: { secretKeyHash: newSecretKeyHash },
    });

    return {
      success: true,
      secretKey: newSecretKey,
      warning: 'Save the new secretKey securely. It will NOT be shown again!',
    };
  });

  // POST /developer/sdk-apps/:id/rotate-api-key - Rotacionar API key
  app.post('/developer/sdk-apps/:id/rotate-api-key', {
    onRequest: authOnRequest,
  }, async (request, reply) => {
    const userId = (request as any).authUser?.sub;
    const { id } = request.params as { id: string };

    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Profile not found' });
    }

    const existing = await prisma.developerApp.findFirst({
      where: { id, developerId: profile.id },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'SDK app not found' });
    }

    // Gerar nova API key
    const newApiKey = generateApiKey(existing.apiKey.startsWith('baz_test_'));

    await prisma.developerApp.update({
      where: { id },
      data: { apiKey: newApiKey },
    });

    return {
      success: true,
      apiKey: newApiKey,
      warning: 'Old API key has been invalidated. Update your app configuration.',
    };
  });

  // ============================================
  // INTERNAL API - Validate API Key (usado pelo host-bridge)
  // ============================================

  // POST /developer/internal/validate-api-key - Validar API key (internal)
  app.post('/developer/internal/validate-api-key', async (request, reply) => {
    const { apiKey, origin, secretKeyHash } = request.body as {
      apiKey: string;
      origin?: string;
      secretKeyHash?: string;
    };

    if (!apiKey) {
      return reply.status(400).send({ valid: false, error: 'API key required' });
    }

    const sdkApp = await prisma.developerApp.findUnique({
      where: { apiKey },
      select: {
        id: true,
        name: true,
        slug: true,
        allowedOrigins: true,
        permissions: true,
        status: true,
        secretKeyHash: true,
        rateLimitCapacity: true,
        rateLimitRefillRate: true,
      },
    });

    if (!sdkApp) {
      return { valid: false, error: 'Invalid API key' };
    }

    if (sdkApp.status !== 'APPROVED') {
      return { valid: false, error: `App status: ${sdkApp.status}` };
    }

    // Validar origem se fornecida
    if (origin && !sdkApp.allowedOrigins.includes(origin)) {
      return { valid: false, error: 'Origin not allowed' };
    }

    // Validar secret key hash se fornecido
    if (secretKeyHash && sdkApp.secretKeyHash !== secretKeyHash) {
      return { valid: false, error: 'Invalid signature' };
    }

    return {
      valid: true,
      app: {
        id: sdkApp.id,
        name: sdkApp.name,
        slug: sdkApp.slug,
        permissions: sdkApp.permissions,
        allowedOrigins: sdkApp.allowedOrigins,
        rateLimitCapacity: sdkApp.rateLimitCapacity,
        rateLimitRefillRate: sdkApp.rateLimitRefillRate,
      },
    };
  });

  // POST /developer/internal/log-usage - Log de uso (internal)
  app.post('/developer/internal/log-usage', async (request, reply) => {
    const { apiKey, messageType, success, errorCode, origin, responseTimeMs } = request.body as {
      apiKey: string;
      messageType: string;
      success: boolean;
      errorCode?: string;
      origin?: string;
      responseTimeMs?: number;
    };

    const sdkApp = await prisma.developerApp.findUnique({
      where: { apiKey },
      select: { id: true },
    });

    if (!sdkApp) {
      return reply.status(404).send({ error: 'App not found' });
    }

    // Criar log e atualizar contador
    await Promise.all([
      prisma.developerAppUsageLog.create({
        data: {
          appId: sdkApp.id,
          messageType,
          success,
          errorCode,
          origin,
          responseTimeMs,
        },
      }),
      prisma.developerApp.update({
        where: { id: sdkApp.id },
        data: {
          totalRequests: { increment: 1 },
          lastRequestAt: new Date(),
        },
      }),
    ]);

    return { success: true };
  });

  // ============================================
  // CLI AUTHENTICATION
  // ============================================

  // POST /developer/cli-token - Generate CLI token for authenticated user
  app.post('/developer/cli-token', {
    onRequest: authOnRequest,
  }, async (request, reply) => {
    const userId = (request as any).authUser?.sub;

    if (!userId) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          select: {
            id: true,
            handle: true,
            displayName: true,
          },
        },
      },
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    // Generate a long-lived CLI token (90 days)
    const tokenPayload = {
      sub: user.id,
      address: user.address,
      type: 'cli' as const,
    };

    const token = jwt.sign(tokenPayload, authConfig.jwtSecret, {
      expiresIn: '90d',
      algorithm: 'HS256',
    });

    app.log.info({ userId, address: user.address }, 'CLI token generated');

    return {
      token,
      expiresIn: 90 * 24 * 60 * 60, // 90 days in seconds
      user: {
        id: user.id,
        address: user.address,
        name: user.profile?.displayName || user.profile?.handle || null,
      },
    };
  });

  // GET /developer/profile - Get developer profile (used by CLI to validate token)
  app.get('/developer/profile', {
    onRequest: authOnRequest,
  }, async (request, reply) => {
    const userId = (request as any).authUser?.sub;

    if (!userId) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          select: {
            id: true,
            handle: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    // Count developer apps
    const appCount = await prisma.thirdPartyApp.count({
      where: { developerId: userId },
    });

    return {
      id: user.id,
      address: user.address,
      name: user.profile?.displayName || user.profile?.handle || null,
      avatarUrl: user.profile?.avatarUrl || null,
      handle: user.profile?.handle || null,
      role: user.role, // 'USER' | 'ADMIN' | 'MODERATOR'
      appCount,
      createdAt: user.createdAt,
    };
  });
}
