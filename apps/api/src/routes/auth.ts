import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import rateLimit from '@fastify/rate-limit';
import { decodeAddress, signatureVerify, cryptoWaitReady } from '@polkadot/util-crypto';
import { isHex } from '@polkadot/util';
import { z } from 'zod';
import { authConfig } from '../config/auth.js';
import {
  hashRefreshToken,
  issueAccessToken,
  issueRefresh,
  rotateRefresh,
  getRefreshCookieOptions,
} from '../lib/auth/jwt.js';
import { authOnRequest } from '../lib/auth/middleware.js';
import { parseMessage } from '@bazari/siws-utils';
import { normalizeSignature, verifySiws } from '../lib/auth/verifySiws.js';
import { mintProfileOnChain } from '../lib/profilesChain.js';
import { createInitialMetadata, publishProfileMetadata } from '../lib/ipfs.js';

const ADDRESS_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const ADDRESS_RATE_LIMIT_MAX = 5;
const addressRateLimiter = new Map<string, { count: number; resetAt: number }>();

class RateLimitError extends Error {
  statusCode = 429;
}

const nonceQuerySchema = z.object({
  address: z.string().min(1),
});

const loginBodySchema = z.object({
  address: z.string().min(1),
  message: z.string().min(1),
  signature: z.string().min(1),
});

const deviceLinkSchema = z.object({
  challenge: z.string().min(1),
  signature: z.string().min(1),
  address: z.string().min(1),
});

function enforceAddressRateLimit(address: string) {
  const now = Date.now();
  const entry = addressRateLimiter.get(address);

  if (!entry || entry.resetAt <= now) {
    addressRateLimiter.set(address, { count: 1, resetAt: now + ADDRESS_RATE_LIMIT_WINDOW_MS });
    return;
  }

  if (entry.count >= ADDRESS_RATE_LIMIT_MAX) {
    throw new RateLimitError('Limite de solicitações de nonce para este endereço excedido.');
  }

  entry.count += 1;
}

function ensureValidAddress(address: string) {
  try {
    decodeAddress(address);
  } catch (error) {
    throw new Error('Endereço SS58 inválido.');
  }
}

async function ensureCrypto() {
  await cryptoWaitReady().catch(() => false);
}

export async function authRoutes(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  await app.register(rateLimit, {
    global: false,
  });

  app.get(
    '/auth/nonce',
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: 5 * 60 * 1000,
        },
      },
    },
    async (request, reply) => {
      let address: string;
      try {
        ({ address } = nonceQuerySchema.parse(request.query));
        ensureValidAddress(address);
        enforceAddressRateLimit(address);
      } catch (error) {
        const err = error as Error & { statusCode?: number };
        const status = err.statusCode ?? 400;
        return reply.status(status).send({ error: err.message });
      }

      const issuedAt = new Date();
      const expiresAt = new Date(issuedAt.getTime() + 10 * 60 * 1000);

      const nonce = randomUUID();

      const record = await prisma.authNonce.create({
        data: {
          address,
          nonce,
          domain: authConfig.domain,
          uri: authConfig.uri,
          genesis: authConfig.genesisHash,
          issuedAt,
          expiresAt,
        },
      });

      return {
        nonce: record.nonce,
        domain: record.domain,
        uri: record.uri,
        genesisHash: record.genesis,
        issuedAt: record.issuedAt.toISOString(),
        expiresAt: record.expiresAt.toISOString(),
      };
    }
  );

  app.post('/auth/login-siws', async (request, reply) => {
    let body: z.infer<typeof loginBodySchema>;

    try {
      body = loginBodySchema.parse(request.body);
      ensureValidAddress(body.address);
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }

    let parsedMessage;
    try {
      parsedMessage = parseMessage(body.message);
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }

    const nonceValue = parsedMessage.nonce;

    const nonceRecord = await prisma.authNonce.findUnique({ where: { nonce: nonceValue } });

    if (!nonceRecord || nonceRecord.address !== body.address) {
      return reply.status(401).send({ error: 'Nonce inválido ou não encontrado.' });
    }

    try {
      await verifySiws({
        message: body.message,
        signature: body.signature,
        address: body.address,
        nonceRecord,
        expectedDomain: authConfig.domain,
        expectedUri: authConfig.uri,
        expectedGenesisHash: authConfig.genesisHash,
      });
    } catch (error) {
      return reply.status(401).send({ error: (error as Error).message });
    }

    await prisma.authNonce.update({
      where: { id: nonceRecord.id },
      data: { usedAt: new Date() },
    });

    const user = await prisma.user.upsert({
      where: { address: body.address },
      update: {},
      create: {
        address: body.address,
      },
    });

    // Buscar ou criar Profile com NFT
    let profile = await prisma.profile.findUnique({
      where: { userId: user.id }
    });

    if (!profile) {
      app.log.info({ event: 'auth.profile.creating', userId: user.id });

      // Gerar handle default (pode ser melhorado depois)
      const defaultHandle = `user_${user.address.slice(0, 8).toLowerCase()}`;

      // Verificar unicidade do handle
      let finalHandle = defaultHandle;
      let counter = 1;
      while (await prisma.profile.findUnique({ where: { handle: finalHandle } })) {
        finalHandle = `${defaultHandle}_${counter}`;
        counter++;
      }

      // 1. Criar Profile temporário (sem onChainProfileId)
      profile = await prisma.profile.create({
        data: {
          userId: user.id,
          handle: finalHandle,
          displayName: finalHandle,
        },
      });

      try {
        // 2. Gerar metadados IPFS
        const metadata = createInitialMetadata(profile);
        const cid = await publishProfileMetadata(metadata);

        // 3. MINTAR NFT ON-CHAIN (BLOQUEANTE ~6s)
        app.log.info({
          event: 'auth.profile.minting',
          address: user.address,
          handle: finalHandle
        });

        const profileId = await mintProfileOnChain(
          user.address,
          finalHandle,
          cid
        );

        app.log.info({
          event: 'auth.profile.minted',
          profileId: profileId.toString()
        });

        // 4. Atualizar Profile com onChainProfileId
        profile = await prisma.profile.update({
          where: { id: profile.id },
          data: {
            onChainProfileId: profileId,
            metadataCid: cid,
            lastChainSync: new Date(),
          },
        });

      } catch (error) {
        app.log.error({
          event: 'auth.profile.mint_failed',
          error: (error as Error).message
        });

        // Rollback: deletar profile se mint falhou
        await prisma.profile.delete({
          where: { id: profile.id }
        }).catch(() => {});

        return reply.status(500).send({
          error: 'Failed to create profile on blockchain',
          retry: true
        });
      }
    }

    const access = issueAccessToken(user);
    await issueRefresh(reply, prisma, user);

    return {
      accessToken: access.token,
      accessTokenExpiresIn: access.expiresIn,
      user: {
        id: user.id,
        address: user.address,
      },
    };
  });

  app.post('/auth/refresh', async (request, reply) => {
    const refreshToken = request.cookies?.[authConfig.refreshCookieName];

    if (!refreshToken) {
      return reply.status(401).send({ error: 'Refresh token ausente.' });
    }

    const tokenHash = hashRefreshToken(refreshToken);
    const tokenRecord = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!tokenRecord || tokenRecord.revokedAt) {
      reply.clearCookie(authConfig.refreshCookieName, getRefreshCookieOptions());
      return reply.status(401).send({ error: 'Refresh token inválido.' });
    }

    const now = Date.now();
    const createdMs = tokenRecord.createdAt.getTime();

    if (now - createdMs > authConfig.refreshTokenExpiresInSeconds * 1000) {
      await prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revokedAt: new Date() },
      });
      reply.clearCookie(authConfig.refreshCookieName, getRefreshCookieOptions());
      return reply.status(401).send({ error: 'Refresh token expirado.' });
    }

    const user = await prisma.user.findUnique({ where: { id: tokenRecord.userId } });

    if (!user) {
      await prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revokedAt: new Date() },
      });
      reply.clearCookie(authConfig.refreshCookieName, getRefreshCookieOptions());
      return reply.status(401).send({ error: 'Usuário não encontrado.' });
    }

    await rotateRefresh(reply, prisma, user, tokenRecord);

    const access = issueAccessToken(user);

    return {
      accessToken: access.token,
      accessTokenExpiresIn: access.expiresIn,
      user: {
        id: user.id,
        address: user.address,
      },
    };
  });

  app.post('/auth/logout', async (request, reply) => {
    const refreshToken = request.cookies?.[authConfig.refreshCookieName];

    if (refreshToken) {
      const tokenHash = hashRefreshToken(refreshToken);
      const tokenRecord = await prisma.refreshToken.findUnique({ where: { tokenHash } });

      if (tokenRecord && !tokenRecord.revokedAt) {
        await prisma.refreshToken.update({
          where: { id: tokenRecord.id },
          data: { revokedAt: new Date() },
        });
      }
    }

    reply.clearCookie(authConfig.refreshCookieName, getRefreshCookieOptions());
    return reply.status(204).send();
  });

  app.post('/auth/device-link', async (request, reply) => {
    let body: z.infer<typeof deviceLinkSchema>;

    try {
      body = deviceLinkSchema.parse(request.body);
      ensureValidAddress(body.address);
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }

    try {
      await ensureCrypto();
      const normalizedSignature = normalizeSignature(body.signature);
      const verification = signatureVerify(body.challenge, normalizedSignature, body.address);

      if (!verification.isValid) {
        return reply.status(401).send({ error: 'Assinatura inválida.' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao validar assinatura.';
      return reply.status(401).send({ error: message });
    }

    return reply.status(200).send({ status: 'ok' });
  });

  app.get('/me', { preHandler: authOnRequest }, async (request) => {
    const authUser = (request as typeof request & { authUser?: { sub: string } }).authUser;

    if (!authUser) {
      return { error: 'Token inválido.' };
    }

    const user = await prisma.user.findUnique({ where: { id: authUser.sub } });

    if (!user) {
      return { error: 'Usuário não encontrado.' };
    }

    return {
      id: user.id,
      address: user.address,
    };
  });
}
