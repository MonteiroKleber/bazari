import { FastifyInstance, FastifyRequest } from 'fastify';
import { authOnRequest } from '../../lib/auth/middleware';
import { chatService } from '../services/chat';
import { AccessTokenPayload } from '../../lib/auth/jwt';

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
}
