// path: apps/api/src/middleware/api-key.middleware.ts
// Bazari Pay - API Key Authentication Middleware (PROMPT-06)

import type { FastifyRequest, FastifyReply } from 'fastify';
import { createHash } from 'crypto';
import { prisma } from '../lib/prisma.js';

export interface ApiKeyPayload {
  keyId: string;
  companyId: string;
  permissions: string[];
}

declare module 'fastify' {
  interface FastifyRequest {
    apiKey?: ApiKeyPayload;
    companyId?: string;
  }
}

/**
 * Hash an API key for storage/comparison
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Generate a secure random API key
 */
export function generateApiKey(): string {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const key = Buffer.from(randomBytes).toString('base64url');
  return `bzr_${key}`;
}

/**
 * Middleware for API key authentication
 * Use this for /api/pay/v1/* routes
 */
export async function apiKeyAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'API key required. Use Authorization: Bearer <api_key>',
    });
  }

  const apiKey = authHeader.substring(7);

  if (!apiKey.startsWith('bzr_')) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid API key format',
    });
  }

  const hashedKey = hashApiKey(apiKey);

  const key = await prisma.payApiKey.findFirst({
    where: {
      keyHash: hashedKey,
      status: 'ACTIVE'
    },
    include: {
      company: {
        select: {
          id: true,
          shopName: true,
          userId: true,
        }
      }
    },
  });

  if (!key) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid or revoked API key',
    });
  }

  // Update last used
  await prisma.payApiKey.update({
    where: { id: key.id },
    data: {
      lastUsedAt: new Date(),
      usageCount: { increment: 1 },
    },
  });

  // Attach to request
  request.apiKey = {
    keyId: key.id,
    companyId: key.companyId,
    permissions: key.permissions,
  };
  request.companyId = key.companyId;
}

/**
 * Check if API key has a specific permission
 */
export function hasPermission(request: FastifyRequest, permission: string): boolean {
  if (!request.apiKey) return false;
  return request.apiKey.permissions.includes(permission);
}

/**
 * Middleware to require a specific permission
 */
export function requirePermission(permission: string) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!hasPermission(request, permission)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: `Missing permission: ${permission}`,
      });
    }
  };
}
