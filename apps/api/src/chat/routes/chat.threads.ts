import { FastifyInstance, FastifyRequest } from 'fastify';
import { authOnRequest } from '../../lib/auth/middleware';
import { chatService, threadPreferenceService } from '../services/chat';
import { AccessTokenPayload } from '../../lib/auth/jwt';
import { sendToProfile } from '../ws/handlers';
import { prisma } from '../../lib/prisma';

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

  // Criar ou buscar DM por handle (usado no perfil público)
  app.post('/chat/threads/dm', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { participantHandle } = req.body as { participantHandle: string };

    if (!participantHandle) {
      return reply.code(400).send({ error: 'participantHandle is required' });
    }

    // Get my profile with full details
    const myProfile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true, handle: true, displayName: true, avatarUrl: true },
    });
    if (!myProfile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    // Get participant profile by handle
    const participant = await prisma.profile.findUnique({
      where: { handle: participantHandle },
      select: { id: true, handle: true, displayName: true, avatarUrl: true },
    });

    if (!participant) {
      return reply.code(404).send({ error: 'User not found' });
    }

    // Cannot start chat with yourself
    if (participant.id === myProfile.id) {
      return reply.code(400).send({ error: 'Cannot start chat with yourself' });
    }

    // Check if DM thread already exists
    const existingThread = await chatService.findDmThread(myProfile.id, participant.id);
    if (existingThread) {
      return { threadId: existingThread.id, created: false };
    }

    // Create new DM thread
    const thread = await chatService.createThread({
      kind: 'dm',
      participants: [myProfile.id, participant.id],
    });

    // Notify the other participant via WebSocket
    const participantsData = [
      {
        profileId: myProfile.id,
        handle: myProfile.handle,
        name: myProfile.displayName || undefined,
        avatarUrl: myProfile.avatarUrl || undefined,
        isOnline: false,
      },
      {
        profileId: participant.id,
        handle: participant.handle,
        name: participant.displayName || undefined,
        avatarUrl: participant.avatarUrl || undefined,
        isOnline: false,
      },
    ];

    sendToProfile(participant.id, {
      op: 'thread:created',
      data: { ...thread, participantsData },
    } as any);

    return { threadId: thread.id, created: true };
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

    // Buscar dados dos participantes para enviar junto com a thread
    const participantsData = await prisma.profile.findMany({
      where: { id: { in: [profile.id, participantId] } },
      select: {
        id: true,
        handle: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    const threadWithParticipants = {
      ...thread,
      participantsData: participantsData.map((p) => ({
        profileId: p.id,
        handle: p.handle,
        name: p.displayName || undefined,
        avatarUrl: p.avatarUrl || undefined,
        isOnline: false,
      })),
    };

    // Notificar o outro participante via WebSocket
    sendToProfile(participantId, {
      op: 'thread:created',
      data: threadWithParticipants,
    } as any);

    return threadWithParticipants;
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

  // === PIN/ARCHIVE ENDPOINTS ===

  // Fixar/desafixar thread
  app.post('/chat/threads/:threadId/pin', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { threadId } = req.params as { threadId: string };
    const { isPinned } = req.body as { isPinned: boolean };

    const profile = await chatService.getProfileByUserId(userId);
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    // Verificar se o usuário é participante da thread
    const thread = await chatService.getThread(threadId);
    if (!thread.participants.includes(profile.id)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const preference = await threadPreferenceService.setPin(threadId, profile.id, isPinned);
    return { success: true, preference };
  });

  // Arquivar/desarquivar thread
  app.post('/chat/threads/:threadId/archive', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { threadId } = req.params as { threadId: string };
    const { isArchived } = req.body as { isArchived: boolean };

    const profile = await chatService.getProfileByUserId(userId);
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    // Verificar se o usuário é participante da thread
    const thread = await chatService.getThread(threadId);
    if (!thread.participants.includes(profile.id)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const preference = await threadPreferenceService.setArchive(threadId, profile.id, isArchived);
    return { success: true, preference };
  });

  // Silenciar/dessilenciar thread
  app.post('/chat/threads/:threadId/mute', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { threadId } = req.params as { threadId: string };
    const { isMuted } = req.body as { isMuted: boolean };

    const profile = await chatService.getProfileByUserId(userId);
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    // Verificar se o usuário é participante da thread
    const thread = await chatService.getThread(threadId);
    if (!thread.participants.includes(profile.id)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const preference = await threadPreferenceService.setMute(threadId, profile.id, isMuted);
    return { success: true, preference };
  });

  // Listar threads arquivadas
  app.get('/chat/threads/archived', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { cursor, limit = '20' } = req.query as { cursor?: string; limit?: string };

    const profile = await chatService.getProfileByUserId(userId);
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    const result = await threadPreferenceService.listArchivedThreads(profile.id, {
      cursor: cursor ? parseInt(cursor) : undefined,
      limit: parseInt(limit),
    });

    return result;
  });

  // Obter preferências de uma thread
  app.get('/chat/threads/:threadId/preferences', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { threadId } = req.params as { threadId: string };

    const profile = await chatService.getProfileByUserId(userId);
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    const preference = await threadPreferenceService.getPreference(threadId, profile.id);
    return { preference };
  });
}
