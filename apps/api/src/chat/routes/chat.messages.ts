import { FastifyInstance, FastifyRequest } from 'fastify';
import { authOnRequest } from '../../lib/auth/middleware';
import { chatService } from '../services/chat';
import { AccessTokenPayload } from '../../lib/auth/jwt';
import { prisma } from '../../lib/prisma';

export default async function chatMessagesRoutes(app: FastifyInstance) {
  // Listar mensagens de uma thread
  app.get('/chat/messages', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { threadId, cursor, limit = '50' } = req.query as {
      threadId: string;
      cursor?: string;
      limit?: string;
    };

    // Get profile ID from user ID
    const profile = await chatService.getProfileByUserId(userId);
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    // Verificar acesso
    const thread = await chatService.getThread(threadId);
    if (!thread.participants.includes(profile.id)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const messages = await chatService.listMessages(threadId, {
      cursor: cursor ? parseInt(cursor) : undefined,
      limit: parseInt(limit),
    });

    return messages;
  });

  // Enviar mensagem (fallback REST)
  app.post('/chat/messages', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { threadId, type, ciphertext, mediaCid, meta, replyTo } = req.body as {
      threadId: string;
      type: string;
      ciphertext: string;
      mediaCid?: string;
      meta?: any;
      replyTo?: string;
    };

    // Get profile ID from user ID
    const profile = await chatService.getProfileByUserId(userId);
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    // Verificar acesso
    const thread = await chatService.getThread(threadId);
    if (!thread.participants.includes(profile.id)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const message = await chatService.createMessage({
      threadId,
      fromProfile: profile.id,
      type,
      ciphertext,
      mediaCid,
      meta,
      replyTo,
    });

    await chatService.updateThreadLastMessage(threadId, message.createdAt);

    return message;
  });

  // Editar mensagem
  app.patch('/chat/messages/:messageId', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { messageId } = req.params as { messageId: string };
    const { ciphertext } = req.body as { ciphertext: string };

    if (!ciphertext) {
      return reply.code(400).send({ error: 'ciphertext is required' });
    }

    // Get profile ID from user ID
    const profile = await chatService.getProfileByUserId(userId);
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    try {
      const message = await chatService.editMessage(messageId, profile.id, ciphertext);
      return message;
    } catch (err: any) {
      if (err.message === 'Message not found') {
        return reply.code(404).send({ error: err.message });
      }
      if (err.message === 'Not authorized to edit this message') {
        return reply.code(403).send({ error: err.message });
      }
      return reply.code(400).send({ error: err.message });
    }
  });

  // Deletar mensagem
  app.delete('/chat/messages/:messageId', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { messageId } = req.params as { messageId: string };

    // Get profile ID from user ID
    const profile = await chatService.getProfileByUserId(userId);
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    try {
      const message = await chatService.deleteMessage(messageId, profile.id);
      return message;
    } catch (err: any) {
      if (err.message === 'Message not found') {
        return reply.code(404).send({ error: err.message });
      }
      if (err.message === 'Not authorized to delete this message') {
        return reply.code(403).send({ error: err.message });
      }
      return reply.code(400).send({ error: err.message });
    }
  });

  // Buscar mensagens (Search)
  app.get('/chat/messages/search', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { q, threadId, limit = '20', offset = '0' } = req.query as {
      q: string;
      threadId?: string;
      limit?: string;
      offset?: string;
    };

    if (!q || q.trim().length < 2) {
      return reply.code(400).send({ error: 'Search query must be at least 2 characters' });
    }

    // Get profile ID from user ID
    const profile = await chatService.getProfileByUserId(userId);
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    try {
      // Buscar threads que o usuário participa
      const userThreads = await prisma.chatThread.findMany({
        where: {
          participants: {
            has: profile.id,
          },
          ...(threadId ? { id: threadId } : {}),
        },
        select: { id: true },
      });

      const threadIds = userThreads.map(t => t.id);

      if (threadIds.length === 0) {
        return { messages: [], total: 0 };
      }

      // Buscar mensagens que contém o termo
      // Nota: Como as mensagens são criptografadas em DMs, a busca só funciona para grupos
      // ou para mensagens onde o ciphertext é o texto em plaintext (grupos)
      const searchTerm = q.trim().toLowerCase();

      const [messages, total] = await Promise.all([
        prisma.chatMessage.findMany({
          where: {
            threadId: { in: threadIds },
            OR: [
              // Buscar no ciphertext (funciona para grupos onde ciphertext = plaintext)
              {
                ciphertext: {
                  contains: searchTerm,
                  mode: 'insensitive',
                },
              },
            ],
          },
          select: {
            id: true,
            threadId: true,
            fromProfile: true,
            type: true,
            ciphertext: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          skip: parseInt(offset),
          take: parseInt(limit),
        }),
        prisma.chatMessage.count({
          where: {
            threadId: { in: threadIds },
            OR: [
              {
                ciphertext: {
                  contains: searchTerm,
                  mode: 'insensitive',
                },
              },
            ],
          },
        }),
      ]);

      // Enriquecer com dados do profile do sender e da thread
      const enrichedMessages = await Promise.all(
        messages.map(async (msg) => {
          const [senderProfile, thread] = await Promise.all([
            prisma.profile.findUnique({
              where: { id: msg.fromProfile },
              select: { id: true, handle: true, displayName: true, avatarUrl: true },
            }),
            prisma.chatThread.findUnique({
              where: { id: msg.threadId },
              select: { id: true, kind: true, groupId: true },
            }),
          ]);

          // Buscar nome do grupo se for grupo
          let threadName: string | null = null;
          if (thread?.kind === 'group' && thread.groupId) {
            const group = await prisma.chatGroup.findUnique({
              where: { id: thread.groupId },
              select: { name: true },
            });
            threadName = group?.name || null;
          }

          return {
            id: msg.id,
            threadId: msg.threadId,
            threadKind: thread?.kind,
            threadName,
            from: msg.fromProfile,
            senderName: senderProfile?.displayName || senderProfile?.handle || 'Usuário',
            senderHandle: senderProfile?.handle,
            senderAvatarUrl: senderProfile?.avatarUrl,
            type: msg.type,
            ciphertext: msg.ciphertext,
            createdAt: Number(msg.createdAt),
          };
        })
      );

      return {
        messages: enrichedMessages,
        total,
        hasMore: parseInt(offset) + messages.length < total,
      };
    } catch (error) {
      req.log.error({ error }, 'Failed to search messages');
      return reply.code(500).send({ error: 'Failed to search messages' });
    }
  });
}
