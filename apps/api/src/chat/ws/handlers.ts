// @ts-nocheck
import type { WebSocket } from '@fastify/websocket';
import { FastifyBaseLogger } from 'fastify';
import { chatService } from '../services/chat';
import { WsClientMsg, WsServerMsg } from '@bazari/shared-types';
import { eventBus } from './events';
import { registerRTCConnection, handleRTCMessage } from './rtc.js';

// Mapa global de conexões ativas
const activeConnections = new Map<string, { socket: WebSocket }>();

export async function handleWsConnection(
  connection: { socket: WebSocket },
  profileId: string,
  log: FastifyBaseLogger
) {
  const { socket } = connection;

  // Registrar conexão
  activeConnections.set(profileId, connection);

  // Registrar para sinalização RTC
  registerRTCConnection(profileId, socket);

  // Presença online
  eventBus.emit('presence', { profileId, status: 'online' });

  socket.on('message', async (data: Buffer) => {
    try {
      const msg: WsClientMsg = JSON.parse(data.toString());

      switch (msg.op) {
        case 'send':
          await handleSendMessage(msg.data, profileId, log);
          break;
        case 'ack':
          await handleAck(msg.data, profileId);
          break;
        case 'presence':
          eventBus.emit('presence', { profileId, status: msg.data.status });
          break;
        case 'typing':
          handleTyping(msg.data, profileId);
          break;
        case 'read':
          await handleReadReceipt(msg.data, profileId);
          break;
        // WebRTC signaling
        case 'rtc:offer':
        case 'rtc:answer':
        case 'rtc:candidate':
        case 'rtc:call-start':
        case 'rtc:call-end':
          handleRTCMessage(msg as any);
          break;
        default:
          log.warn({ op: msg.op }, 'Unknown WS op');
      }
    } catch (err: any) {
      log.error({ err }, 'WS message error');
      socket.send(JSON.stringify({
        op: 'error',
        data: { message: 'Invalid message format' },
      }));
    }
  });

  socket.on('close', () => {
    activeConnections.delete(profileId);
    eventBus.emit('presence', { profileId, status: 'offline' });
    log.info({ profileId }, 'Chat WS disconnected');
  });

  socket.on('error', (err: Error) => {
    log.error({ err, profileId }, 'Chat WS error');
  });
}

async function handleSendMessage(data: any, fromProfile: string, log: FastifyBaseLogger) {
  const { threadId, type, ciphertext, mediaCid, meta, replyTo } = data;

  // Validações básicas
  if (!threadId || !type || !ciphertext) {
    throw new Error('Missing required fields');
  }

  // Salvar mensagem
  const message = await chatService.createMessage({
    threadId,
    fromProfile,
    type,
    ciphertext,
    mediaCid,
    meta,
    replyTo,
  });

  // Atualizar thread
  await chatService.updateThreadLastMessage(threadId, message.createdAt);

  // Notificar participantes
  const thread = await chatService.getThread(threadId);
  const recipients = thread.participants.filter((p: string) => p !== fromProfile);

  for (const recipientId of recipients) {
    const conn = activeConnections.get(recipientId);
    if (conn) {
      const serverMsg: WsServerMsg = {
        op: 'message',
        data: message,
      };
      conn.socket.send(JSON.stringify(serverMsg));
    }
  }

  // Enviar ack para o sender
  const senderConn = activeConnections.get(fromProfile);
  if (senderConn) {
    senderConn.socket.send(JSON.stringify({
      op: 'receipt',
      data: { messageId: message.id, status: 'sent' },
    }));
  }

  log.info({ messageId: message.id, threadId }, 'Message sent');
}

async function handleAck(data: any, profileId: string) {
  const { messageId, status } = data;

  if (status === 'delivered') {
    await chatService.markDelivered(messageId);
  }
}

function handleTyping(data: any, profileId: string) {
  const { threadId, typing } = data;

  // Broadcast para outros participantes
  // (simplificado, pode usar Redis pub/sub para múltiplos servers)
  eventBus.emit('typing', { threadId, profileId, typing });
}

async function handleReadReceipt(data: any, profileId: string) {
  const { messageId } = data;
  await chatService.markRead(messageId, profileId);
}
// @ts-nocheck
