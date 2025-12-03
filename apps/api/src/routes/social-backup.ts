/**
 * OAuth Multi-Conta - Endpoints para gerenciar múltiplos backups E2EE
 * Cada usuário OAuth pode ter N contas, cada uma com backup E2EE separado
 */
// @ts-nocheck - Type incompatibilities with Fastify overloads

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authOnRequest } from '../lib/auth/middleware.js';

interface CreateBackupBody {
  accountName: string;
  encryptedMnemonic: string;
  iv: string;
  salt: string;
  authTag: string;
  iterations?: number;
  address: string;
  deviceFingerprint?: string;
}

interface UpdateBackupBody {
  accountName?: string;
  lastUsedAt?: boolean; // Flag para atualizar timestamp
}

export async function socialBackupRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/auth/social-backup/create
   * Criar novo backup E2EE para usuário OAuth (multi-conta)
   */
  fastify.post('/auth/social-backup/create', {
    onRequest: authOnRequest,
    config: {
      rateLimit: {
        max: 20, // Permitir criar várias contas
        timeWindow: '1 minute'
      }
    }
  }, async (request: FastifyRequest<{ Body: CreateBackupBody }>, reply: FastifyReply) => {
    try {
      const authUser = (request as any).authUser;
      const userId = authUser?.sub;

      if (!userId) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid or missing authentication token'
        });
      }

      const { accountName, encryptedMnemonic, iv, salt, authTag, iterations, address, deviceFingerprint } = request.body;

      // Validação
      if (!accountName || !encryptedMnemonic || !iv || !salt || !authTag || !address) {
        return reply.code(400).send({
          error: 'Missing required fields',
          message: 'accountName, encryptedMnemonic, iv, salt, authTag, address são obrigatórios'
        });
      }

      // Verificar se address já existe (global unique)
      const existingAddress = await prisma.socialBackup.findUnique({
        where: { address },
        select: { id: true, userId: true }
      });

      if (existingAddress) {
        return reply.code(409).send({
          error: 'Address already exists',
          message: 'Este address já está vinculado a outra conta'
        });
      }

      // Obter próximo accountIndex para este usuário
      const maxIndex = await prisma.socialBackup.findFirst({
        where: { userId },
        orderBy: { accountIndex: 'desc' },
        select: { accountIndex: true }
      });

      const nextIndex = (maxIndex?.accountIndex ?? 0) + 1;

      // Criar backup
      const backup = await prisma.socialBackup.create({
        data: {
          userId,
          accountName,
          accountIndex: nextIndex,
          address,
          encryptedMnemonic,
          iv,
          salt,
          authTag,
          iterations: iterations ?? 150000,
          deviceFingerprint,
          isActive: true
        },
        select: {
          id: true,
          accountName: true,
          accountIndex: true,
          address: true,
          createdAt: true
        }
      });

      fastify.log.info({ userId, accountIndex: nextIndex, address }, '[SocialBackup] Backup criado');

      return reply.code(201).send({
        success: true,
        backup
      });
    } catch (error) {
      fastify.log.error('Erro ao criar backup social:', error);
      return reply.code(500).send({
        error: 'Failed to create backup',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/auth/social-backup/list
   * Listar todos os backups ativos do usuário OAuth
   */
  fastify.get('/auth/social-backup/list', {
    onRequest: authOnRequest
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authUser = (request as any).authUser;
      const userId = authUser?.sub;

      if (!userId) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid or missing authentication token'
        });
      }

      const backups = await prisma.socialBackup.findMany({
        where: {
          userId,
          isActive: true
        },
        select: {
          id: true,
          accountName: true,
          accountIndex: true,
          address: true,
          createdAt: true,
          lastUsedAt: true,
          deviceFingerprint: true
        },
        orderBy: {
          lastUsedAt: 'desc' // Mais recente primeiro
        }
      });

      return reply.code(200).send({
        backups,
        total: backups.length
      });
    } catch (error) {
      fastify.log.error('Erro ao listar backups:', error);
      return reply.code(500).send({
        error: 'Failed to list backups',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/auth/social-backup/:id
   * Buscar backup específico (para restore)
   */
  fastify.get<{ Params: { id: string } }>('/auth/social-backup/:id', {
    onRequest: authOnRequest
  }, async (request, reply) => {
    try {
      const authUser = (request as any).authUser;
      const userId = authUser?.sub;

      if (!userId) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid or missing authentication token'
        });
      }

      const { id } = request.params;

      const backup = await prisma.socialBackup.findFirst({
        where: {
          id,
          userId, // Verificar ownership
          isActive: true
        },
        select: {
          id: true,
          accountName: true,
          accountIndex: true,
          address: true,
          encryptedMnemonic: true,
          iv: true,
          salt: true,
          authTag: true,
          iterations: true,
          createdAt: true,
          lastUsedAt: true
        }
      });

      if (!backup) {
        return reply.code(404).send({
          error: 'Backup not found',
          message: 'Backup não encontrado ou você não tem permissão'
        });
      }

      return reply.code(200).send({
        wallet: {
          encryptedMnemonic: backup.encryptedMnemonic,
          iv: backup.iv,
          salt: backup.salt,
          authTag: backup.authTag,
          iterations: backup.iterations,
          address: backup.address
        },
        metadata: {
          id: backup.id,
          accountName: backup.accountName,
          accountIndex: backup.accountIndex,
          createdAt: backup.createdAt,
          lastUsedAt: backup.lastUsedAt
        }
      });
    } catch (error) {
      fastify.log.error('Erro ao buscar backup:', error);
      return reply.code(500).send({
        error: 'Failed to fetch backup',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * PATCH /api/auth/social-backup/:id
   * Atualizar backup (renomear conta ou atualizar lastUsedAt)
   */
  fastify.patch<{ Params: { id: string }; Body: UpdateBackupBody }>('/auth/social-backup/:id', {
    onRequest: authOnRequest
  }, async (request, reply) => {
    try {
      const authUser = (request as any).authUser;
      const userId = authUser?.sub;

      if (!userId) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid or missing authentication token'
        });
      }

      const { id } = request.params;
      const { accountName, lastUsedAt } = request.body;

      // Verificar ownership
      const existing = await prisma.socialBackup.findFirst({
        where: { id, userId, isActive: true },
        select: { id: true }
      });

      if (!existing) {
        return reply.code(404).send({
          error: 'Backup not found',
          message: 'Backup não encontrado ou você não tem permissão'
        });
      }

      const updateData: any = {};
      if (accountName) updateData.accountName = accountName;
      if (lastUsedAt) updateData.lastUsedAt = new Date();

      const updated = await prisma.socialBackup.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          accountName: true,
          accountIndex: true,
          address: true,
          lastUsedAt: true
        }
      });

      return reply.code(200).send({
        success: true,
        backup: updated
      });
    } catch (error) {
      fastify.log.error('Erro ao atualizar backup:', error);
      return reply.code(500).send({
        error: 'Failed to update backup',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * DELETE /api/auth/social-backup/:id
   * Deletar backup (soft delete)
   */
  fastify.delete<{ Params: { id: string } }>('/auth/social-backup/:id', {
    onRequest: authOnRequest
  }, async (request, reply) => {
    try {
      const authUser = (request as any).authUser;
      const userId = authUser?.sub;

      if (!userId) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid or missing authentication token'
        });
      }

      const { id } = request.params;

      // Verificar ownership
      const existing = await prisma.socialBackup.findFirst({
        where: { id, userId, isActive: true },
        select: { id: true, accountName: true }
      });

      if (!existing) {
        return reply.code(404).send({
          error: 'Backup not found',
          message: 'Backup não encontrado ou você não tem permissão'
        });
      }

      // Soft delete
      await prisma.socialBackup.update({
        where: { id },
        data: { isActive: false }
      });

      fastify.log.info({ userId, backupId: id, accountName: existing.accountName }, '[SocialBackup] Backup deletado (soft)');

      return reply.code(200).send({
        success: true,
        message: 'Backup deletado com sucesso'
      });
    } catch (error) {
      fastify.log.error('Erro ao deletar backup:', error);
      return reply.code(500).send({
        error: 'Failed to delete backup',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
