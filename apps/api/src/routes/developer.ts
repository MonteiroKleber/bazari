// path: apps/api/src/routes/developer.ts
// BazariOS Developer Portal API

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authOnRequest } from '../lib/auth/middleware.js';

const createAppSchema = z.object({
  appId: z.string().min(3).regex(/^[a-z][a-z0-9.]*$/i, 'App ID must start with a letter'),
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
    const userId = (request as any).userId;

    const apps = await prisma.thirdPartyApp.findMany({
      where: { developerId: userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { reviews: true, versions: true },
        },
      },
    });

    return { apps };
  });

  // GET /developer/apps/:id - Detalhes de um app
  app.get('/developer/apps/:id', {
    onRequest: authOnRequest,
  }, async (request, reply) => {
    const userId = (request as any).userId;
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
                  select: { handle: true, avatar: true },
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
    const userId = (request as any).userId;

    const validation = createAppSchema.safeParse(request.body);
    if (!validation.success) {
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
    const userId = (request as any).userId;
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
        permissions: body.permissions ?? existing.permissions,
      },
    });

    return { app: appData };
  });

  // DELETE /developer/apps/:id - Deletar app (apenas em DRAFT)
  app.delete('/developer/apps/:id', {
    onRequest: authOnRequest,
  }, async (request, reply) => {
    const userId = (request as any).userId;
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
    const userId = (request as any).userId;
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
    const userId = (request as any).userId;
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
}
