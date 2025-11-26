// @ts-nocheck
import type { WebSocket } from '@fastify/websocket';
import { FastifyBaseLogger } from 'fastify';
import type {
  VRClientMessage,
  VRServerMessage,
  VRConnection,
} from './types.js';

// Mapa global de conexões VR ativas (userId → connection)
const activeConnections = new Map<string, { socket: WebSocket; info: VRConnection }>();

// Mapa de conexões por zona (worldZone → Set<userId>)
const zoneConnections = new Map<string, Set<string>>();

/**
 * Registra uma nova conexão VR
 */
export function registerVRConnection(
  userId: string,
  userName: string,
  socket: WebSocket,
  avatarUrl?: string
) {
  const connection: VRConnection = {
    userId,
    userName,
    avatarUrl,
    worldZone: 'plaza', // Todos começam na praça
    position: { x: 0, y: 1, z: -110 }, // Posição inicial padrão (frente do prédio)
    rotation: { x: 0, y: 0, z: 0 },
    isVoiceActive: false,
    connectedAt: new Date(),
  };

  activeConnections.set(userId, { socket, info: connection });

  // Adicionar à zona plaza
  if (!zoneConnections.has('plaza')) {
    zoneConnections.set('plaza', new Set());
  }
  zoneConnections.get('plaza')!.add(userId);

  return connection;
}

/**
 * Remove uma conexão VR
 */
export function unregisterVRConnection(userId: string) {
  const conn = activeConnections.get(userId);
  if (conn) {
    // Remover da zona
    const zone = conn.info.worldZone;
    const zoneSet = zoneConnections.get(zone);
    if (zoneSet) {
      zoneSet.delete(userId);
    }

    activeConnections.delete(userId);
  }
}

/**
 * Envia mensagem para um usuário específico
 */
function sendToUser(userId: string, message: VRServerMessage) {
  const conn = activeConnections.get(userId);
  if (conn && conn.socket.readyState === 1) { // 1 = OPEN
    conn.socket.send(JSON.stringify(message));
  }
}

/**
 * Broadcast para todos usuários em uma zona específica
 */
function broadcastToZone(worldZone: string, message: VRServerMessage, excludeUserId?: string) {
  const usersInZone = zoneConnections.get(worldZone);
  if (!usersInZone) return;

  for (const userId of usersInZone) {
    if (userId !== excludeUserId) {
      sendToUser(userId, message);
    }
  }
}

/**
 * Broadcast para todos usuários conectados
 */
function broadcastToAll(message: VRServerMessage, excludeUserId?: string) {
  for (const [userId] of activeConnections) {
    if (userId !== excludeUserId) {
      sendToUser(userId, message);
    }
  }
}

/**
 * Handler principal de conexão WebSocket VR
 */
export async function handleVRConnection(
  socket: WebSocket,
  userId: string,
  userName: string,
  log: FastifyBaseLogger,
  avatarUrl?: string
) {
  // Registrar conexão
  const connection = registerVRConnection(userId, userName, socket, avatarUrl);

  log.info({ userId, userName, worldZone: connection.worldZone }, 'VR user connected');

  // Notificar TODOS os usuários conectados (não apenas na mesma zona)
  broadcastToAll({
    op: 'avatar:join',
    data: {
      userId,
      userName,
      avatarUrl,
      position: connection.position,
      worldZone: connection.worldZone,
    },
  }, userId);

  // Enviar estado de TODOS os jogadores conectados para o novo usuário
  sendZoneStats(userId, connection.worldZone);

  // Handler de mensagens
  socket.on('message', async (data: Buffer) => {
    try {
      const msg: VRClientMessage = JSON.parse(data.toString());

      switch (msg.op) {
        case 'avatar:move':
          await handleAvatarMove(msg.data, userId, log);
          break;
        case 'chat:send':
          await handleChatSend(msg.data, userId, log);
          break;
        case 'voice:start':
          await handleVoiceStart(msg.data, userId, log);
          break;
        case 'voice:stop':
          await handleVoiceStop(msg.data, userId, log);
          break;
        case 'presence':
          log.info({ userId, status: msg.data.status }, 'VR presence update');
          break;
        default:
          log.warn({ op: (msg as any).op }, 'Unknown VR WebSocket operation');
      }
    } catch (err) {
      log.error({ err }, 'VR WebSocket message error');
      sendToUser(userId, {
        op: 'error',
        data: {
          code: 'MESSAGE_PARSE_ERROR',
          message: 'Failed to parse message',
        },
      });
    }
  });

  // Handler de desconexão
  socket.on('close', () => {
    log.info({ userId }, 'VR user disconnected');

    const conn = activeConnections.get(userId);
    if (conn) {
      // Notificar TODOS os usuários conectados
      broadcastToAll({
        op: 'avatar:leave',
        data: { userId },
      }, userId);

      unregisterVRConnection(userId);
    }
  });

  socket.on('error', (err) => {
    log.error({ err, userId }, 'VR WebSocket error');
  });
}

/**
 * Handle avatar:move - Sincronizar posição do avatar
 */
async function handleAvatarMove(
  data: { position: any; rotation: any; animation?: string; worldZone: string },
  userId: string,
  log: FastifyBaseLogger
) {
  const conn = activeConnections.get(userId);
  if (!conn) {
    log.warn({ userId }, 'handleAvatarMove: Connection not found');
    return;
  }

  log.info({
    userId,
    position: data.position,
    worldZone: data.worldZone,
  }, 'Received avatar:move');

  // Atualizar posição local
  conn.info.position = data.position;
  conn.info.rotation = data.rotation;

  // Mudança de zona?
  if (data.worldZone !== conn.info.worldZone) {
    const oldZone = conn.info.worldZone;
    const newZone = data.worldZone;

    // Remover da zona antiga
    const oldZoneSet = zoneConnections.get(oldZone);
    if (oldZoneSet) {
      oldZoneSet.delete(userId);
    }

    // Adicionar à nova zona
    if (!zoneConnections.has(newZone)) {
      zoneConnections.set(newZone, new Set());
    }
    zoneConnections.get(newZone)!.add(userId);

    conn.info.worldZone = newZone;

    // Notificar zona antiga que usuário saiu
    broadcastToZone(oldZone, {
      op: 'avatar:leave',
      data: { userId },
    }, userId);

    // Notificar nova zona que usuário entrou
    broadcastToZone(newZone, {
      op: 'avatar:join',
      data: {
        userId,
        userName: conn.info.userName,
        avatarUrl: conn.info.avatarUrl,
        position: data.position,
        worldZone: newZone,
      },
    }, userId);

    // Enviar estado da nova zona
    sendZoneStats(userId, newZone);

    log.info({ userId, oldZone, newZone }, 'VR user changed zone');
  } else {
    // Broadcast movimento para TODOS os jogadores conectados (não apenas na mesma zona)
    const message = {
      op: 'avatar:update',
      data: {
        userId,
        userName: conn.info.userName,
        position: data.position,
        rotation: data.rotation,
        animation: data.animation,
        worldZone: data.worldZone,
      },
    };

    broadcastToAll(message, userId);
  }
}

/**
 * Handle chat:send - Enviar mensagem de chat
 */
async function handleChatSend(
  data: { message: string; worldZone: string },
  userId: string,
  log: FastifyBaseLogger
) {
  const conn = activeConnections.get(userId);
  if (!conn) return;

  // Validar mensagem
  if (!data.message || data.message.trim().length === 0) {
    return;
  }

  if (data.message.length > 500) {
    sendToUser(userId, {
      op: 'error',
      data: {
        code: 'MESSAGE_TOO_LONG',
        message: 'Message exceeds 500 characters',
      },
    });
    return;
  }

  // Broadcast para zona
  broadcastToZone(data.worldZone, {
    op: 'chat:broadcast',
    data: {
      userId,
      userName: conn.info.userName,
      message: data.message.trim(),
      worldZone: data.worldZone,
      timestamp: new Date().toISOString(),
    },
  });

  log.info({ userId, worldZone: data.worldZone, messageLength: data.message.length }, 'VR chat message sent');
}

/**
 * Handle voice:start - Iniciar transmissão de voz
 */
async function handleVoiceStart(
  data: { worldZone: string },
  userId: string,
  log: FastifyBaseLogger
) {
  const conn = activeConnections.get(userId);
  if (!conn) return;

  conn.info.isVoiceActive = true;

  // Notificar outros usuários na zona
  broadcastToZone(data.worldZone, {
    op: 'voice:user_started',
    data: {
      userId,
      userName: conn.info.userName,
    },
  }, userId);

  log.info({ userId, worldZone: data.worldZone }, 'VR voice started');
}

/**
 * Handle voice:stop - Parar transmissão de voz
 */
async function handleVoiceStop(
  data: { worldZone: string },
  userId: string,
  log: FastifyBaseLogger
) {
  const conn = activeConnections.get(userId);
  if (!conn) return;

  conn.info.isVoiceActive = false;

  // Notificar outros usuários na zona
  broadcastToZone(data.worldZone, {
    op: 'voice:user_stopped',
    data: { userId },
  }, userId);

  log.info({ userId, worldZone: data.worldZone }, 'VR voice stopped');
}

/**
 * Envia estatísticas de TODOS os jogadores conectados para um usuário
 * (não apenas os da mesma zona)
 */
function sendZoneStats(userId: string, worldZone: string) {
  const avatars: Array<{ userId: string; userName: string; position: any; worldZone: string }> = [];

  // Enviar TODOS os jogadores conectados, independente da zona
  for (const [otherUserId, conn] of activeConnections) {
    if (otherUserId !== userId) {
      avatars.push({
        userId: otherUserId,
        userName: conn.info.userName,
        position: conn.info.position,
        worldZone: conn.info.worldZone,
      });
    }
  }

  sendToUser(userId, {
    op: 'zone:stats',
    data: {
      worldZone,
      onlineCount: activeConnections.size,
      avatars,
    },
  });
}

/**
 * Get connection stats (útil para monitoramento)
 */
export function getVRStats() {
  const stats = {
    totalConnections: activeConnections.size,
    zones: {} as Record<string, number>,
  };

  for (const [zone, users] of zoneConnections) {
    stats.zones[zone] = users.size;
  }

  return stats;
}
// @ts-nocheck
