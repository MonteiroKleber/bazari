// path: apps/api/src/routes/stories.ts
// BazChat Stories/Status API

import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authOnRequest } from '../lib/auth/middleware.js';
import { AccessTokenPayload } from '../lib/auth/jwt.js';

const prisma = new PrismaClient();

// Helper para obter profileId do userId
async function getProfileId(userId: string): Promise<string | null> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return profile?.id || null;
}

// ============================================
// SCHEMAS
// ============================================

const createStorySchema = z.object({
  type: z.enum(['TEXT', 'IMAGE', 'VIDEO']),
  text: z.string().max(500).optional(),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  mediaCid: z.string().optional(),
  mediaType: z.string().optional(),
  duration: z.number().int().positive().optional(),
});

const replyStorySchema = z.object({
  message: z.string().min(1).max(1000),
});

// ============================================
// ROUTES
// ============================================

export default async function storiesRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  // Criar story
  app.post('/stories', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;

    const profileId = await getProfileId(userId);
    if (!profileId) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    const validation = createStorySchema.safeParse(req.body);
    if (!validation.success) {
      return reply.code(400).send({ error: validation.error.errors });
    }

    const { type, text, textColor, backgroundColor, mediaCid, mediaType, duration } = validation.data;

    // Validações específicas
    if (type === 'TEXT' && !text) {
      return reply.code(400).send({ error: 'Text is required for TEXT stories' });
    }
    if ((type === 'IMAGE' || type === 'VIDEO') && !mediaCid) {
      return reply.code(400).send({ error: 'Media CID is required for IMAGE/VIDEO stories' });
    }

    const story = await prisma.story.create({
      data: {
        profileId,
        type,
        text,
        textColor,
        backgroundColor,
        mediaCid,
        mediaType,
        duration,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // +24h
      },
      include: {
        profile: {
          select: { id: true, handle: true, displayName: true, avatarUrl: true },
        },
      },
    });

    return story;
  });

  // Listar stories dos contatos (feed)
  app.get('/stories/feed', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;

    const profileId = await getProfileId(userId);
    if (!profileId) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    // Buscar contatos (pessoas com quem tem thread DM)
    const threads = await prisma.chatThread.findMany({
      where: {
        kind: 'dm',
        participants: { has: profileId },
      },
      select: { participants: true },
    });

    const contactIds = new Set<string>();
    threads.forEach(t => {
      t.participants.forEach(p => {
        if (p !== profileId) contactIds.add(p);
      });
    });

    // Buscar stories ativos dos contatos + próprio usuário
    const allIds = [...contactIds, profileId];

    const stories = await prisma.story.findMany({
      where: {
        profileId: { in: allIds },
        expiresAt: { gt: new Date() },
      },
      include: {
        profile: {
          select: { id: true, handle: true, displayName: true, avatarUrl: true },
        },
        views: {
          where: { viewerId: profileId },
          select: { viewedAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Agrupar por usuário
    const grouped = new Map<string, {
      profile: { id: string; handle: string; displayName: string | null; avatarUrl: string | null };
      stories: typeof stories;
      hasUnviewed: boolean;
      latestAt: Date;
      isOwn: boolean;
    }>();

    stories.forEach(story => {
      const pid = story.profileId;
      const existing = grouped.get(pid);
      const isViewed = story.views.length > 0;
      const isOwn = pid === profileId;

      if (existing) {
        existing.stories.push(story);
        if (!isViewed && !isOwn) existing.hasUnviewed = true;
      } else {
        grouped.set(pid, {
          profile: story.profile,
          stories: [story],
          hasUnviewed: !isViewed && !isOwn,
          latestAt: story.createdAt,
          isOwn,
        });
      }
    });

    // Ordenar: próprio primeiro, depois não vistos, depois por data
    const result = Array.from(grouped.values()).sort((a, b) => {
      // Próprio sempre primeiro
      if (a.isOwn && !b.isOwn) return -1;
      if (!a.isOwn && b.isOwn) return 1;
      // Não vistos antes dos vistos
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;
      // Por data
      return b.latestAt.getTime() - a.latestAt.getTime();
    });

    return result;
  });

  // Meus stories
  app.get('/stories/mine', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;

    const profileId = await getProfileId(userId);
    if (!profileId) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    const stories = await prisma.story.findMany({
      where: {
        profileId,
        expiresAt: { gt: new Date() },
      },
      include: {
        views: {
          include: {
            viewer: {
              select: { id: true, handle: true, displayName: true, avatarUrl: true },
            },
          },
          orderBy: { viewedAt: 'desc' },
        },
        _count: { select: { views: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return stories;
  });

  // Ver story (registrar visualização)
  app.post('/stories/:storyId/view', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { storyId } = req.params as { storyId: string };

    const viewerId = await getProfileId(userId);
    if (!viewerId) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) {
      return reply.code(404).send({ error: 'Story not found' });
    }

    // Não registrar view do próprio story
    if (story.profileId === viewerId) {
      return { success: true };
    }

    // Verificar se já visualizou
    const existingView = await prisma.storyView.findUnique({
      where: {
        storyId_viewerId: { storyId, viewerId },
      },
    });

    if (!existingView) {
      // Criar view e incrementar contador
      await prisma.$transaction([
        prisma.storyView.create({
          data: { storyId, viewerId },
        }),
        prisma.story.update({
          where: { id: storyId },
          data: { viewCount: { increment: 1 } },
        }),
      ]);
    }

    return { success: true };
  });

  // Responder story
  app.post('/stories/:storyId/reply', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { storyId } = req.params as { storyId: string };

    const fromId = await getProfileId(userId);
    if (!fromId) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    const validation = replyStorySchema.safeParse(req.body);
    if (!validation.success) {
      return reply.code(400).send({ error: validation.error.errors });
    }

    const { message } = validation.data;

    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: { profile: true },
    });

    if (!story) {
      return reply.code(404).send({ error: 'Story not found' });
    }

    // Não pode responder ao próprio story
    if (story.profileId === fromId) {
      return reply.code(400).send({ error: 'Cannot reply to own story' });
    }

    // Criar resposta
    const storyReply = await prisma.storyReply.create({
      data: { storyId, fromId, message },
    });

    // Criar/buscar thread DM com o autor do story
    let thread = await prisma.chatThread.findFirst({
      where: {
        kind: 'dm',
        participants: { hasEvery: [fromId, story.profileId] },
      },
    });

    const now = BigInt(Date.now());

    if (!thread) {
      thread = await prisma.chatThread.create({
        data: {
          kind: 'dm',
          participants: [fromId, story.profileId],
          lastMessageAt: now,
          createdAt: now,
          updatedAt: now,
        },
      });
    }

    // Criar mensagem referenciando o story
    const chatMessage = await prisma.chatMessage.create({
      data: {
        threadId: thread.id,
        fromProfile: fromId,
        type: 'text',
        ciphertext: `[Resposta ao status: ${story.text?.substring(0, 30) || 'Mídia'}...]\n\n${message}`,
        createdAt: now,
      },
    });

    return {
      success: true,
      replyId: storyReply.id,
      threadId: thread.id,
      messageId: chatMessage.id,
    };
  });

  // Deletar story
  app.delete('/stories/:storyId', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { storyId } = req.params as { storyId: string };

    const profileId = await getProfileId(userId);
    if (!profileId) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) {
      return reply.code(404).send({ error: 'Story not found' });
    }

    if (story.profileId !== profileId) {
      return reply.code(403).send({ error: 'Not authorized' });
    }

    await prisma.story.delete({ where: { id: storyId } });

    return { success: true };
  });

  // Job para expirar stories (pode ser chamado via cron)
  app.post('/stories/expire', async (_req, reply) => {
    const result = await prisma.story.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    console.log(`[ExpireStories] Deleted ${result.count} expired stories`);
    return { deleted: result.count };
  });
}
