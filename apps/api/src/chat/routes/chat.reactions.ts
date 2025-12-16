import { FastifyInstance, FastifyRequest } from 'fastify';
import { authOnRequest } from '../../lib/auth/middleware';
import { chatService } from '../services/chat';
import { AccessTokenPayload } from '../../lib/auth/jwt';
import { prisma } from '../../lib/prisma';

export default async function chatReactionsRoutes(app: FastifyInstance) {
  // Adicionar ou remover reação
  app.post('/chat/messages/:messageId/reactions', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { messageId } = req.params as { messageId: string };
    const { emoji, action } = req.body as { emoji: string; action: 'add' | 'remove' };

    // Get profile ID from user ID
    const profile = await chatService.getProfileByUserId(userId);
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    // Verificar se a mensagem existe e se o usuário tem acesso à thread
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: { threadId: true },
    });

    if (!message) {
      return reply.code(404).send({ error: 'Message not found' });
    }

    const thread = await chatService.getThread(message.threadId);
    if (!thread.participants.includes(profile.id)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    // Validar emoji (apenas emojis básicos permitidos)
    const allowedEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏', '🎉', '💯'];
    if (!allowedEmojis.includes(emoji)) {
      return reply.code(400).send({ error: 'Invalid emoji' });
    }

    if (action === 'add') {
      // Verificar limite de reações por mensagem (máximo 20 tipos de emojis)
      const existingReactionsCount = await prisma.chatMessageReaction.groupBy({
        by: ['emoji'],
        where: { messageId },
      });

      if (existingReactionsCount.length >= 20) {
        const existingEmoji = existingReactionsCount.find((r: { emoji: string }) => r.emoji === emoji);
        if (!existingEmoji) {
          return reply.code(400).send({ error: 'Maximum emoji types reached for this message' });
        }
      }

      // Adicionar reação (upsert para evitar duplicatas)
      const reaction = await prisma.chatMessageReaction.upsert({
        where: {
          messageId_profileId_emoji: {
            messageId,
            profileId: profile.id,
            emoji,
          },
        },
        create: {
          messageId,
          profileId: profile.id,
          emoji,
        },
        update: {}, // Não atualiza nada se já existe
        include: {
          profile: {
            select: {
              id: true,
              displayName: true,
              handle: true,
              avatarUrl: true,
            },
          },
        },
      });

      return {
        success: true,
        reaction: {
          id: reaction.id,
          messageId: reaction.messageId,
          profileId: reaction.profileId,
          emoji: reaction.emoji,
          createdAt: reaction.createdAt.toISOString(),
          profile: reaction.profile,
        },
      };
    } else {
      // Remover reação
      await prisma.chatMessageReaction.deleteMany({
        where: {
          messageId,
          profileId: profile.id,
          emoji,
        },
      });

      return { success: true };
    }
  });

  // Listar quem reagiu a uma mensagem
  app.get('/chat/messages/:messageId/reactions', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { messageId } = req.params as { messageId: string };
    const { emoji } = req.query as { emoji?: string };

    // Get profile ID from user ID
    const profile = await chatService.getProfileByUserId(userId);
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    // Verificar se a mensagem existe e se o usuário tem acesso à thread
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: { threadId: true },
    });

    if (!message) {
      return reply.code(404).send({ error: 'Message not found' });
    }

    const thread = await chatService.getThread(message.threadId);
    if (!thread.participants.includes(profile.id)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    // Buscar reações
    const reactions = await prisma.chatMessageReaction.findMany({
      where: {
        messageId,
        ...(emoji ? { emoji } : {}),
      },
      include: {
        profile: {
          select: {
            id: true,
            displayName: true,
            handle: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      reactions: reactions.map((r: typeof reactions[0]) => ({
        id: r.id,
        messageId: r.messageId,
        profileId: r.profileId,
        emoji: r.emoji,
        createdAt: r.createdAt.toISOString(),
        profile: r.profile,
      })),
    };
  });
}
