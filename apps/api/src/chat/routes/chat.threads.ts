import { FastifyInstance, FastifyRequest } from 'fastify';
import { authOnRequest } from '../../lib/auth/middleware';
import { chatService } from '../services/chat';
import { AccessTokenPayload } from '../../lib/auth/jwt';

export default async function chatThreadsRoutes(app: FastifyInstance) {
  // Listar threads do usuário
  app.get('/chat/threads', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { cursor, limit = '20' } = req.query as { cursor?: string; limit?: string };

    // Get profile ID from user ID
    const profile = await chatService.getProfileByUserId(userId);
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    const threads = await chatService.listThreads(profile.id, {
      cursor: cursor ? parseInt(cursor) : undefined,
      limit: parseInt(limit),
    });

    return threads;
  });

  // Criar thread (DM)
  app.post('/chat/threads', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { participantId, kind = 'dm' } = req.body as { participantId: string; kind?: string };

    // Get profile ID from user ID
    const profile = await chatService.getProfileByUserId(userId);
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    // Verificar se já existe thread entre os dois
    const existingThread = await chatService.findDmThread(profile.id, participantId);
    if (existingThread) {
      return existingThread;
    }

    // Criar nova thread
    const thread = await chatService.createThread({
      kind,
      participants: [profile.id, participantId],
    });

    return thread;
  });

  // Get thread específica
  app.get('/chat/threads/:threadId', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { threadId } = req.params as { threadId: string };

    // Get profile ID from user ID
    const profile = await chatService.getProfileByUserId(userId);
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    const thread = await chatService.getThread(threadId);

    // Verificar se o usuário é participante
    if (!thread.participants.includes(profile.id)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    return thread;
  });
}
