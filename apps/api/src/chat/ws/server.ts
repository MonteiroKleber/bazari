import { FastifyInstance, FastifyRequest } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { verifyAccessToken } from '../../lib/auth/jwt';
import { handleWsConnection } from './handlers';
import { chatConfig } from '../../config/env';
import { chatService } from '../services/chat';

export async function setupChatWebSocket(app: FastifyInstance) {
  await app.register(fastifyWebsocket, {
    options: {
      maxPayload: 1048576, // 1MB
      clientTracking: true,
    },
  });

  app.get('/chat/ws', { websocket: true }, async (connection, req) => {
    // Autenticar via query param ou header
    const query = req.query as { token?: string };
    const token = query.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      connection.close(4001, 'Unauthorized');
      return;
    }

    try {
      const payload = verifyAccessToken(token);
      const userId = payload.sub; // JWT contains User ID, not Profile ID

      // Get profile ID from user ID
      const profile = await chatService.getProfileByUserId(userId);
      if (!profile) {
        connection.close(4004, 'Profile not found');
        return;
      }

      // Registrar conexão
      req.log.info({ profileId: profile.id, userId }, 'Chat WS connected');

      // Handler principal
      await handleWsConnection({ socket: connection }, profile.id, req.log);
    } catch (err) {
      req.log.error({ err }, 'Chat WS auth failed');
      connection.close(4001, 'Unauthorized');
    }
  });

  app.log.info({ port: chatConfig.wsPort }, 'Chat WebSocket ready');
}
