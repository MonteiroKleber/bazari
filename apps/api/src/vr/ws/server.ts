import { FastifyInstance } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { handleVRConnection, getVRStats } from './handlers.js';
import { verifyAccessToken } from '../../lib/auth/jwt.js';
import type { PrismaClient } from '@prisma/client';

/**
 * Setup VR WebSocket Server
 * Endpoint: /vr/ws
 */
export async function setupVRWebSocket(app: FastifyInstance, prisma: PrismaClient) {
  // Note: @fastify/websocket plugin is registered by setupChatWebSocket
  // So we can use { websocket: true } directly

  // WebSocket endpoint para VR
  app.get('/vr/ws', { websocket: true }, async (connection, req) => {
    // Autenticação via query param token
    const query = req.query as { token?: string };

    const token = query.token;

    if (!token) {
      connection.close(4001, 'Missing authentication token');
      return;
    }

    // Validar JWT
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      req.log.warn({ err }, 'Invalid VR WebSocket token');
      connection.close(4002, 'Invalid or expired token');
      return;
    }

    // Buscar perfil do usuário
    const profile = await prisma.profile.findUnique({
      where: { userId: payload.sub },
      select: {
        displayName: true,
        avatarUrl: true
      }
    });

    if (!profile) {
      connection.close(4003, 'Profile not found');
      return;
    }

    try {
      // Handler principal
      await handleVRConnection(
        connection,
        payload.sub,
        profile.displayName,
        req.log,
        profile.avatarUrl || undefined
      );
    } catch (err) {
      req.log.error({ err }, 'VR WebSocket connection error');
      connection.close(4000, 'Internal server error');
    }
  });

  // Endpoint REST para estatísticas VR (opcional, útil para debugging)
  app.get('/vr/ws/stats', async (request, reply) => {
    const stats = getVRStats();
    return reply.send(stats);
  });

  app.log.info('VR WebSocket ready at /vr/ws');
}
