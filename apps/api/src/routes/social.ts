import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authOnRequest } from '../lib/auth/middleware.js';
import { createNotification } from '../lib/notifications.js';
import { checkAchievements } from '../lib/achievementChecker.js';

export async function socialRoutes(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  const bodySchema = z.object({ targetHandle: z.string().min(1) });

  app.post('/social/follow', {
    preHandler: authOnRequest,
    config: { rateLimit: { max: Number(process.env.RATE_LIMIT_FOLLOW || '30'), timeWindow: '5 minutes' } },
  }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });
    let body: z.infer<typeof bodySchema>;
    try { body = bodySchema.parse(request.body); } catch (e) { return reply.status(400).send({ error: (e as Error).message }); }

    const [meProfile, target] = await Promise.all([
      prisma.profile.findUnique({ where: { userId: authUser.sub }, select: { id: true, handle: true, followingCount: true } }),
      prisma.profile.findUnique({ where: { handle: body.targetHandle }, select: { id: true, handle: true, followersCount: true, userId: true } }),
    ]);
    if (!meProfile) return reply.status(400).send({ error: 'Perfil do usuário não encontrado' });
    if (!target) return reply.status(404).send({ error: 'Alvo inexistente' });
    if (meProfile.id === target.id) return reply.status(400).send({ error: 'Não é possível seguir a si mesmo' });

    let created = false;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.follow.create({ data: { followerId: meProfile.id, followingId: target.id } });
        await tx.profile.update({ where: { id: meProfile.id }, data: { followingCount: { increment: 1 } } });
        await tx.profile.update({ where: { id: target.id }, data: { followersCount: { increment: 1 } } });
        created = true;
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        // idempotente: já segue
        created = false;
      } else {
        throw e;
      }
    }

    // Criar notificação se follow foi criado
    if (created) {
      await createNotification(prisma, {
        userId: target.userId,
        type: 'FOLLOW',
        actorId: meProfile.id
      });

      // Verificar conquistas (tanto quem seguiu quanto quem foi seguido)
      checkAchievements(prisma, authUser.sub, 'FOLLOW').catch(err =>
        app.log.error({ err, userId: authUser.sub }, 'Erro ao verificar conquistas')
      );
      checkAchievements(prisma, target.userId, 'FOLLOW').catch(err =>
        app.log.error({ err, userId: target.userId }, 'Erro ao verificar conquistas')
      );
    }

    // Buscar contadores atualizados
    const [meNew, targetNew] = await Promise.all([
      prisma.profile.findUnique({ where: { id: meProfile.id }, select: { followingCount: true } }),
      prisma.profile.findUnique({ where: { id: target.id }, select: { followersCount: true } }),
    ]);

    app.log.info({ event: 'follow.success', actorProfileId: meProfile.id, targetHandle: target.handle });
    return reply.send({ status: 'following', target: { handle: target.handle }, counts: { me: { following: meNew?.followingCount ?? meProfile.followingCount }, target: { followers: targetNew?.followersCount ?? target.followersCount } } });
  });

  app.post('/social/unfollow', {
    preHandler: authOnRequest,
    config: { rateLimit: { max: Number(process.env.RATE_LIMIT_FOLLOW || '30'), timeWindow: '5 minutes' } },
  }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });
    let body: z.infer<typeof bodySchema>;
    try { body = bodySchema.parse(request.body); } catch (e) { return reply.status(400).send({ error: (e as Error).message }); }

    const [meProfile, target] = await Promise.all([
      prisma.profile.findUnique({ where: { userId: authUser.sub }, select: { id: true, handle: true, followingCount: true } }),
      prisma.profile.findUnique({ where: { handle: body.targetHandle }, select: { id: true, handle: true, followersCount: true } }),
    ]);
    if (!meProfile) return reply.status(400).send({ error: 'Perfil do usuário não encontrado' });
    if (!target) return reply.status(404).send({ error: 'Alvo inexistente' });
    if (meProfile.id === target.id) return reply.status(400).send({ error: 'Não é possível desfazer follow de si mesmo' });

    // tentar deletar, se não existir é idempotente
    const existing = await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: meProfile.id, followingId: target.id } } }).catch(() => null);
    if (existing) {
      await prisma.$transaction(async (tx) => {
        await tx.follow.delete({ where: { id: existing.id } });
        await tx.profile.update({ where: { id: meProfile.id }, data: { followingCount: { decrement: 1 } } });
        await tx.profile.update({ where: { id: target.id }, data: { followersCount: { decrement: 1 } } });
      });
    }

    const [meNew, targetNew] = await Promise.all([
      prisma.profile.findUnique({ where: { id: meProfile.id }, select: { followingCount: true } }),
      prisma.profile.findUnique({ where: { id: target.id }, select: { followersCount: true } }),
    ]);

    app.log.info({ event: 'unfollow.success', actorProfileId: meProfile.id, targetHandle: target.handle });
    return reply.send({ status: 'not_following', target: { handle: target.handle }, counts: { me: { following: meNew?.followingCount ?? meProfile.followingCount }, target: { followers: targetNew?.followersCount ?? target.followersCount } } });
  });
}

export default socialRoutes;
