import type { WebSocket } from '@fastify/websocket';
import { FastifyBaseLogger } from 'fastify';
import { chatService } from '../services/chat';
import { WsClientMsg, WsServerMsg } from '@bazari/shared-types';
import { eventBus } from './events';
import { registerRTCConnection, handleRTCMessage } from './rtc.js';
import { prisma } from '../../lib/prisma';
import {
  handleCallOffer,
  handleCallAnswer,
  handleCallReject,
  handleCallEnd,
  handleIceCandidate,
  handleCallDisconnect,
} from './call-handlers.js';

// Mapa global de conexões ativas
const activeConnections = new Map<string, { socket: WebSocket; profileId: string }>();

// Mapa de usuários digitando (threadId -> Map<profileId, timeout>)
const typingUsers = new Map<string, Map<string, NodeJS.Timeout>>();

// Timeout para auto-stop de typing (5 segundos)
const TYPING_TIMEOUT_MS = 5000;

/**
 * Envia mensagem para um profile específico se estiver conectado
 */
export function sendToProfile(profileId: string, msg: WsServerMsg): boolean {
  const conn = activeConnections.get(profileId);
  if (conn && conn.socket.readyState === 1) { // WebSocket.OPEN
    conn.socket.send(JSON.stringify(msg));
    return true;
  }
  return false;
}

/**
 * Handler principal de conexão WebSocket
 */
export async function handleWsConnection(
  connection: { socket: WebSocket },
  profileId: string,
  log: FastifyBaseLogger
) {
  const { socket } = connection;

  // Registrar conexão
  activeConnections.set(profileId, { socket, profileId });

  // Registrar para sinalização RTC
  registerRTCConnection(profileId, socket);

  // Presença online - notificar contatos
  broadcastPresenceToContacts(profileId, 'online', log);

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

        // Typing indicators (novo formato)
        case 'typing:start':
          await handleTypingStart(msg.data, profileId, log);
          break;

        case 'typing:stop':
          await handleTypingStop(msg.data, profileId, log);
          break;

        // Legacy typing support
        case 'typing' as any:
          if (msg.data.typing) {
            await handleTypingStart(msg.data, profileId, log);
          } else {
            await handleTypingStop(msg.data, profileId, log);
          }
          break;

        // Delivery receipt
        case 'receipt:delivered':
          await handleDeliveryReceipt(msg.data, profileId, log);
          break;

        // Read receipt
        case 'receipt:read':
          await handleReadReceipt(msg.data, profileId, log);
          break;

        // Legacy read support
        case 'read' as any:
          await handleReadReceipt({ threadId: msg.data.threadId, messageIds: [msg.data.messageId] }, profileId, log);
          break;

        // WebRTC signaling
        case 'rtc:offer':
        case 'rtc:answer':
        case 'rtc:candidate':
        case 'rtc:call-start':
        case 'rtc:call-end':
          handleRTCMessage(msg as any);
          break;

        // Chat reactions
        case 'chat:reaction':
          await handleChatReaction(msg.data, profileId, log);
          break;

        // Message edit/delete
        case 'message:edit':
          await handleMessageEdit(msg.data, profileId, log);
          break;

        case 'message:delete':
          await handleMessageDelete(msg.data, profileId, log);
          break;

        // Voice/Video calls
        case 'call:offer':
          await handleCallOffer(socket, profileId, msg.data);
          break;

        case 'call:answer':
          await handleCallAnswer(socket, profileId, msg.data);
          break;

        case 'call:reject':
          await handleCallReject(socket, profileId, msg.data);
          break;

        case 'call:end':
          await handleCallEnd(socket, profileId, msg.data);
          break;

        case 'ice:candidate':
          await handleIceCandidate(socket, profileId, msg.data);
          break;

        default:
          log.warn({ op: msg.op }, 'Unknown WS op');
      }
    } catch (err: any) {
      log.error({ err }, 'WS message error');
      socket.send(JSON.stringify({
        op: 'error',
        data: { message: err.message || 'Invalid message format' },
      }));
    }
  });

  socket.on('close', async () => {
    // Limpar todos os typing timeouts deste usuário
    for (const [threadId, users] of typingUsers.entries()) {
      if (users.has(profileId)) {
        clearTimeout(users.get(profileId));
        users.delete(profileId);
        // Notificar que parou de digitar
        broadcastTypingStatus(threadId, profileId, false, log);
      }
    }

    // Encerrar chamadas ativas do usuário
    handleCallDisconnect(profileId);

    activeConnections.delete(profileId);

    // Atualizar lastSeenAt no banco
    try {
      await prisma.profile.update({
        where: { id: profileId },
        data: { lastSeenAt: new Date() },
      });
    } catch (err) {
      log.error({ err, profileId }, 'Error updating lastSeenAt');
    }

    // Presença offline - notificar contatos
    broadcastPresenceToContacts(profileId, 'offline', log, new Date().toISOString());

    log.info({ profileId }, 'Chat WS disconnected');
  });

  socket.on('error', (err: Error) => {
    log.error({ err, profileId }, 'Chat WS error');
  });
}

/**
 * Handler para envio de mensagem
 */
async function handleSendMessage(data: any, fromProfile: string, log: FastifyBaseLogger) {
  const { threadId, type, ciphertext, mediaCid, meta, replyTo } = data;

  // Validações básicas
  // ciphertext só é obrigatório para mensagens de texto
  // Para mídia (audio, image, video, file), pode ser vazio
  if (!threadId || !type || (type === 'text' && !ciphertext)) {
    throw new Error('Missing required fields');
  }

  // Parar typing indicator ao enviar mensagem
  await handleTypingStop({ threadId }, fromProfile, log);

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

  // Se tem replyTo, buscar dados da mensagem original
  let messageWithReplyData = message;
  if (replyTo) {
    const replyToData = await getReplyToData(replyTo);
    messageWithReplyData = { ...message, replyToData };
  }

  // Atualizar thread
  await chatService.updateThreadLastMessage(threadId, message.createdAt);

  // Notificar participantes
  const thread = await chatService.getThread(threadId);
  const recipients = thread.participants.filter((p: string) => p !== fromProfile);

  for (const recipientId of recipients) {
    sendToProfile(recipientId, {
      op: 'message',
      data: messageWithReplyData,
    });
  }

  // Enviar confirmação para o sender também (com replyToData)
  sendToProfile(fromProfile, {
    op: 'message',
    data: messageWithReplyData,
  });

  // Enviar status 'sent' para o sender
  sendToProfile(fromProfile, {
    op: 'message:status',
    data: {
      messageId: message.id,
      status: 'sent',
      timestamp: Date.now(),
    },
  });

  log.info({ messageId: message.id, threadId }, 'Message sent');
}

/**
 * Busca dados de uma mensagem de reply
 */
async function getReplyToData(messageId: string) {
  const replyMessage = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      fromProfile: true,
      type: true,
      ciphertext: true,
      mediaCid: true,
    },
  });

  if (!replyMessage) {
    return {
      id: messageId,
      from: '',
      type: 'text' as const,
      deleted: true,
    };
  }

  // Buscar dados do autor
  const author = await prisma.profile.findUnique({
    where: { id: replyMessage.fromProfile },
    select: { id: true, displayName: true, handle: true },
  });

  return {
    id: replyMessage.id,
    from: replyMessage.fromProfile,
    fromName: author?.displayName || undefined,
    fromHandle: author?.handle || undefined,
    type: replyMessage.type as 'text' | 'audio' | 'image' | 'file' | 'video' | 'proposal' | 'checkout' | 'payment' | 'system',
    ciphertext: replyMessage.ciphertext,
    mediaCid: replyMessage.mediaCid || undefined,
  };
}

/**
 * Handler para ACK (legacy)
 */
async function handleAck(data: any, profileId: string) {
  const { messageId, status } = data;

  if (status === 'delivered') {
    await chatService.markDelivered(messageId);
  }
}

/**
 * Handler para início de digitação
 */
async function handleTypingStart(data: any, profileId: string, log: FastifyBaseLogger) {
  const { threadId } = data;

  if (!threadId) return;

  // Inicializar mapa para esta thread se não existir
  if (!typingUsers.has(threadId)) {
    typingUsers.set(threadId, new Map());
  }

  const threadTyping = typingUsers.get(threadId)!;

  // Limpar timeout anterior se existir
  if (threadTyping.has(profileId)) {
    clearTimeout(threadTyping.get(profileId));
  }

  // Configurar auto-stop após timeout
  const timeout = setTimeout(() => {
    threadTyping.delete(profileId);
    broadcastTypingStatus(threadId, profileId, false, log);
  }, TYPING_TIMEOUT_MS);

  // Só broadcast se não estava digitando antes
  const wasTyping = threadTyping.has(profileId);
  threadTyping.set(profileId, timeout);

  if (!wasTyping) {
    broadcastTypingStatus(threadId, profileId, true, log);
  }
}

/**
 * Handler para fim de digitação
 */
async function handleTypingStop(data: any, profileId: string, log: FastifyBaseLogger) {
  const { threadId } = data;

  if (!threadId) return;

  const threadTyping = typingUsers.get(threadId);
  if (threadTyping?.has(profileId)) {
    clearTimeout(threadTyping.get(profileId));
    threadTyping.delete(profileId);
    broadcastTypingStatus(threadId, profileId, false, log);
  }
}

/**
 * Broadcast do status de digitação para outros participantes
 */
async function broadcastTypingStatus(
  threadId: string,
  profileId: string,
  isTyping: boolean,
  log: FastifyBaseLogger
) {
  try {
    // Buscar dados do profile
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: { id: true, handle: true, displayName: true },
    });

    if (!profile) return;

    // Buscar participantes da thread
    const thread = await chatService.getThread(threadId);

    // Enviar para todos exceto quem está digitando
    for (const participantId of thread.participants) {
      if (participantId !== profileId) {
        sendToProfile(participantId, {
          op: 'typing',
          data: {
            threadId,
            profileId,
            handle: profile.handle,
            displayName: profile.displayName || profile.handle,
            isTyping,
          },
        });
      }
    }
  } catch (err) {
    log.error({ err, threadId, profileId }, 'Error broadcasting typing status');
  }
}

/**
 * Handler para delivery receipt
 */
async function handleDeliveryReceipt(data: any, profileId: string, log: FastifyBaseLogger) {
  const { messageIds } = data;

  if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) return;

  const now = Date.now();

  for (const messageId of messageIds) {
    try {
      // Buscar mensagem
      const message = await prisma.chatMessage.findUnique({
        where: { id: messageId },
        select: { id: true, fromProfile: true, deliveredAt: true },
      });

      if (!message) continue;

      // Só atualizar se ainda não foi entregue
      if (!message.deliveredAt) {
        await prisma.chatMessage.update({
          where: { id: messageId },
          data: { deliveredAt: now },
        });

        // Notificar remetente
        sendToProfile(message.fromProfile, {
          op: 'message:status',
          data: {
            messageId,
            status: 'delivered',
            timestamp: now,
          },
        });
      }
    } catch (err) {
      log.error({ err, messageId }, 'Error handling delivery receipt');
    }
  }
}

/**
 * Handler para read receipt
 */
async function handleReadReceipt(data: any, profileId: string, log: FastifyBaseLogger) {
  const { threadId, messageIds } = data;

  if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) return;

  const now = Date.now();

  for (const messageId of messageIds) {
    try {
      // Buscar mensagem
      const message = await prisma.chatMessage.findUnique({
        where: { id: messageId },
        select: { id: true, fromProfile: true, threadId: true, readAt: true },
      });

      if (!message) continue;

      // Não marcar próprias mensagens como lidas
      if (message.fromProfile === profileId) continue;

      // Só atualizar se ainda não foi lida
      if (!message.readAt) {
        await prisma.chatMessage.update({
          where: { id: messageId },
          data: { readAt: now },
        });

        // Notificar remetente
        sendToProfile(message.fromProfile, {
          op: 'message:status',
          data: {
            messageId,
            status: 'read',
            timestamp: now,
          },
        });
      }
    } catch (err) {
      log.error({ err, messageId }, 'Error handling read receipt');
    }
  }
}

/**
 * Handler para reações em mensagens
 */
async function handleChatReaction(data: any, profileId: string, log: FastifyBaseLogger) {
  const { messageId, emoji, action } = data;

  if (!messageId || !emoji || !action) {
    throw new Error('Missing required fields for reaction');
  }

  // Validar emoji (apenas emojis básicos permitidos)
  const allowedEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏', '🎉', '💯'];
  if (!allowedEmojis.includes(emoji)) {
    throw new Error('Invalid emoji');
  }

  // Buscar mensagem e verificar acesso
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    select: { threadId: true },
  });

  if (!message) {
    throw new Error('Message not found');
  }

  const thread = await chatService.getThread(message.threadId);
  if (!thread.participants.includes(profileId)) {
    throw new Error('Forbidden');
  }

  // Buscar dados do profile
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { id: true, handle: true, displayName: true, avatarUrl: true },
  });

  if (!profile) {
    throw new Error('Profile not found');
  }

  if (action === 'add') {
    // Adicionar reação
    await prisma.chatMessageReaction.upsert({
      where: {
        messageId_profileId_emoji: {
          messageId,
          profileId,
          emoji,
        },
      },
      create: {
        messageId,
        profileId,
        emoji,
      },
      update: {},
    });
  } else if (action === 'remove') {
    // Remover reação
    await prisma.chatMessageReaction.deleteMany({
      where: {
        messageId,
        profileId,
        emoji,
      },
    });
  }

  // Broadcast para todos os participantes da thread
  for (const participantId of thread.participants) {
    sendToProfile(participantId, {
      op: 'chat:reaction',
      data: {
        messageId,
        profileId,
        emoji,
        action,
        user: {
          id: profile.id,
          displayName: profile.displayName || profile.handle,
          handle: profile.handle,
          avatarUrl: profile.avatarUrl,
        },
      },
    });
  }

  log.info({ messageId, profileId, emoji, action }, 'Chat reaction processed');
}

/**
 * Handler para edição de mensagem via WebSocket
 */
async function handleMessageEdit(data: any, profileId: string, log: FastifyBaseLogger) {
  const { messageId, ciphertext } = data;

  if (!messageId || !ciphertext) {
    throw new Error('Missing messageId or ciphertext');
  }

  try {
    const updatedMessage = await chatService.editMessage(messageId, profileId, ciphertext);

    if (!updatedMessage) {
      throw new Error('Failed to edit message');
    }

    // Broadcast para todos os participantes da thread
    const thread = await chatService.getThread(updatedMessage.threadId);

    for (const participantId of thread.participants) {
      sendToProfile(participantId, {
        op: 'message:edited',
        data: {
          messageId: updatedMessage.id,
          threadId: updatedMessage.threadId,
          ciphertext: updatedMessage.ciphertext,
          editedAt: updatedMessage.editedAt,
        },
      } as any);
    }

    log.info({ messageId, profileId }, 'Message edited');
  } catch (err: any) {
    log.error({ err, messageId, profileId }, 'Error editing message');
    throw err;
  }
}

/**
 * Handler para deleção de mensagem via WebSocket
 */
async function handleMessageDelete(data: any, profileId: string, log: FastifyBaseLogger) {
  const { messageId } = data;

  if (!messageId) {
    throw new Error('Missing messageId');
  }

  try {
    // Buscar mensagem para obter threadId antes de deletar
    const message = await chatService.getMessage(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    const deletedMessage = await chatService.deleteMessage(messageId, profileId);

    if (!deletedMessage) {
      throw new Error('Failed to delete message');
    }

    // Broadcast para todos os participantes da thread
    const thread = await chatService.getThread(message.threadId);

    for (const participantId of thread.participants) {
      sendToProfile(participantId, {
        op: 'message:deleted',
        data: {
          messageId: deletedMessage.id,
          threadId: deletedMessage.threadId,
          deletedAt: deletedMessage.deletedAt,
        },
      } as any);
    }

    log.info({ messageId, profileId }, 'Message deleted');
  } catch (err: any) {
    log.error({ err, messageId, profileId }, 'Error deleting message');
    throw err;
  }
}

/**
 * Busca todos os contatos de um usuário (usuários com quem teve conversas)
 */
async function getProfileContacts(profileId: string): Promise<string[]> {
  const threads = await prisma.chatThread.findMany({
    where: {
      participants: {
        has: profileId,
      },
    },
    select: {
      participants: true,
    },
  });

  const contactIds = new Set<string>();
  threads.forEach(thread => {
    thread.participants.forEach(p => {
      if (p !== profileId) {
        contactIds.add(p);
      }
    });
  });

  return Array.from(contactIds);
}

/**
 * Broadcast de presença para todos os contatos de um usuário
 */
async function broadcastPresenceToContacts(
  profileId: string,
  status: 'online' | 'offline',
  log: FastifyBaseLogger,
  lastSeenAt?: string
) {
  try {
    // Verificar se o usuário permite mostrar status online
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: { showOnlineStatus: true },
    });

    // Se o usuário não permite mostrar status, não fazer broadcast
    if (!profile?.showOnlineStatus) return;

    // Buscar contatos
    const contacts = await getProfileContacts(profileId);

    // Broadcast para cada contato online
    for (const contactId of contacts) {
      sendToProfile(contactId, {
        op: 'presence:update',
        data: {
          profileId,
          status,
          lastSeenAt,
        },
      });
    }
  } catch (err) {
    log.error({ err, profileId }, 'Error broadcasting presence');
  }
}

/**
 * Obtém o status de presença de um usuário
 */
export async function getUserPresence(profileId: string): Promise<{
  profileId: string;
  status: 'online' | 'offline';
  lastSeenAt?: string;
}> {
  if (activeConnections.has(profileId)) {
    return { profileId, status: 'online' };
  }

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { lastSeenAt: true, showOnlineStatus: true },
  });

  if (!profile?.showOnlineStatus) {
    return { profileId, status: 'offline' };
  }

  return {
    profileId,
    status: 'offline',
    lastSeenAt: profile.lastSeenAt?.toISOString(),
  };
}

/**
 * Exportar função para verificar se um usuário está online
 */
export function isUserOnline(profileId: string): boolean {
  return activeConnections.has(profileId);
}

/**
 * Exportar função para obter conexões ativas (para uso interno)
 */
export function getActiveConnections() {
  return activeConnections;
}

/**
 * Obter conexão de um profile específico
 */
export function getConnectionByProfileId(profileId: string): WebSocket | null {
  const conn = activeConnections.get(profileId);
  return conn?.socket || null;
}
