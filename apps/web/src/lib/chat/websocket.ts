import { chatConfig } from '../config/chat';
import { WsClientMsg, WsServerMsg } from '@bazari/shared-types';
import { chatNotificationService } from './notifications';
import { chatSoundService } from './sounds';

type MessageHandler = (msg: WsServerMsg) => void;
type ConnectionStatusHandler = (connected: boolean) => void;
type NewMessageHandler = (msg: any, currentProfileId: string | null) => void;

interface QueuedMessage {
  msg: WsClientMsg;
  timestamp: number;
  retries: number;
}

class ChatWebSocketClient {
  private ws: WebSocket | null = null;
  private handlers: MessageHandler[] = [];
  private statusHandlers: ConnectionStatusHandler[] = [];
  private newMessageHandlers: NewMessageHandler[] = [];
  private reconnectTimer: any = null;
  private token: string | null = null;
  private currentProfileId: string | null = null;

  // Exponential backoff
  private reconnectAttempts = 0;
  private readonly baseDelay = 1000; // 1 second
  private readonly maxDelay = 30000; // 30 seconds
  private readonly maxReconnectAttempts = 10;

  // Message queue for offline support
  private messageQueue: QueuedMessage[] = [];
  private readonly maxQueueSize = 100;
  private readonly maxMessageAge = 5 * 60 * 1000; // 5 minutes
  private readonly maxRetries = 3;

  // Typing indicator state
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private readonly typingDebounceMs = 3000;

  connect(token: string) {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.token = token;
    const url = `${chatConfig.wsUrl}?token=${encodeURIComponent(token)}`;

    console.log(`[ChatWS] Connecting... (attempt ${this.reconnectAttempts + 1})`);
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('[ChatWS] Connected');
      this.reconnectAttempts = 0;

      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      // Flush message queue
      this.flushMessageQueue();

      // Notify status handlers
      this.notifyStatusHandlers(true);
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: WsServerMsg = JSON.parse(event.data);
        this.handlers.forEach(h => h(msg));

        // Handle new message notifications
        if (msg.op === 'message') {
          const message = msg.data as any;

          // Only notify for messages from others
          if (message.from !== this.currentProfileId) {
            // Play notification sound
            chatSoundService.play();

            // Show push notification
            const senderName = message.senderName || message.senderHandle || 'Nova mensagem';
            const preview = this.getMessagePreview(message);
            chatNotificationService.notifyNewMessage(
              senderName,
              preview,
              message.threadId,
              message.id
            );

            // Notify new message handlers
            this.newMessageHandlers.forEach(h => h(message, this.currentProfileId));
          }
        }
      } catch (err) {
        console.error('[ChatWS] Parse error:', err);
      }
    };

    this.ws.onerror = (err) => {
      console.error('[ChatWS] Error:', err);
    };

    this.ws.onclose = (event) => {
      console.log('[ChatWS] Disconnected', event.code, event.reason);
      this.ws = null;

      // Notify status handlers
      this.notifyStatusHandlers(false);

      // Schedule reconnect with exponential backoff
      this.scheduleReconnect();
    };
  }

  disconnect() {
    console.log('[ChatWS] Disconnecting');
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Limpar token para evitar reconexão com token inválido
    this.token = null;

    this.ws?.close(1000, 'Client disconnect');
    this.ws = null;
  }

  send(msg: WsClientMsg) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(msg));
      } catch (err) {
        console.error('[ChatWS] Send error:', err);
        this.queueMessage(msg);
      }
    } else {
      console.warn('[ChatWS] Not connected, queueing message');
      this.queueMessage(msg);
    }
  }

  onMessage(handler: MessageHandler) {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter(h => h !== handler);
    };
  }

  onStatusChange(handler: ConnectionStatusHandler) {
    this.statusHandlers.push(handler);
    return () => {
      this.statusHandlers = this.statusHandlers.filter(h => h !== handler);
    };
  }

  private notifyStatusHandlers(connected: boolean) {
    this.statusHandlers.forEach(h => h(connected));
  }

  private queueMessage(msg: WsClientMsg) {
    // Only queue 'send' operations
    if (msg.op !== 'send') return;

    // Remove old messages from queue
    const now = Date.now();
    this.messageQueue = this.messageQueue.filter(
      qm => now - qm.timestamp < this.maxMessageAge
    );

    // Check queue size limit
    if (this.messageQueue.length >= this.maxQueueSize) {
      console.warn('[ChatWS] Message queue full, dropping oldest message');
      this.messageQueue.shift();
    }

    // Add to queue
    this.messageQueue.push({
      msg,
      timestamp: now,
      retries: 0,
    });

    console.log(`[ChatWS] Message queued (${this.messageQueue.length} in queue)`);
  }

  private flushMessageQueue() {
    if (this.messageQueue.length === 0) return;

    console.log(`[ChatWS] Flushing message queue (${this.messageQueue.length} messages)`);

    const messages = [...this.messageQueue];
    this.messageQueue = [];

    messages.forEach(qm => {
      if (qm.retries < this.maxRetries) {
        try {
          this.send(qm.msg);
        } catch (err) {
          console.error('[ChatWS] Failed to flush message:', err);
          qm.retries++;
          if (qm.retries < this.maxRetries) {
            this.messageQueue.push(qm);
          }
        }
      } else {
        console.warn('[ChatWS] Message exceeded max retries, dropping');
      }
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[ChatWS] Max reconnect attempts reached, giving up');
      return;
    }

    // Exponential backoff: delay = baseDelay * 2^attempts (capped at maxDelay)
    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempts),
      this.maxDelay
    );

    console.log(`[ChatWS] Reconnecting in ${delay}ms...`);

    this.reconnectTimer = setTimeout(() => {
      if (this.token) {
        this.reconnectAttempts++;
        this.connect(this.token);
      }
    }, delay);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getQueueSize(): number {
    return this.messageQueue.length;
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  /**
   * Envia indicador de que o usuário está digitando.
   * Implementa debounce automático de 3 segundos.
   */
  sendTypingStart(threadId: string) {
    // Enviar evento de typing
    this.send({ op: 'typing:start', data: { threadId } } as WsClientMsg);

    // Limpar timeout anterior se existir
    const existingTimeout = this.typingTimeouts.get(threadId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Configurar auto-stop após debounce
    const timeout = setTimeout(() => {
      this.sendTypingStop(threadId);
    }, this.typingDebounceMs);

    this.typingTimeouts.set(threadId, timeout);
  }

  /**
   * Envia indicador de que o usuário parou de digitar.
   */
  sendTypingStop(threadId: string) {
    // Limpar timeout se existir
    const existingTimeout = this.typingTimeouts.get(threadId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.typingTimeouts.delete(threadId);
    }

    this.send({ op: 'typing:stop', data: { threadId } } as WsClientMsg);
  }

  /**
   * Envia confirmação de entrega de mensagens.
   */
  sendDeliveryReceipt(messageIds: string[]) {
    if (messageIds.length === 0) return;
    this.send({ op: 'receipt:delivered', data: { messageIds } } as WsClientMsg);
  }

  /**
   * Envia confirmação de leitura de mensagens.
   */
  sendReadReceipt(threadId: string, messageIds: string[]) {
    if (messageIds.length === 0) return;
    this.send({ op: 'receipt:read', data: { threadId, messageIds } } as WsClientMsg);
  }

  /**
   * Define o ID do perfil atual (para filtrar notificações de mensagens próprias)
   */
  setCurrentProfileId(profileId: string | null) {
    this.currentProfileId = profileId;
  }

  /**
   * Registra handler para novas mensagens (para atualização de badges, etc)
   */
  onNewMessage(handler: NewMessageHandler) {
    this.newMessageHandlers.push(handler);
    return () => {
      this.newMessageHandlers = this.newMessageHandlers.filter(h => h !== handler);
    };
  }

  /**
   * Gera preview do conteúdo da mensagem para notificação
   */
  private getMessagePreview(message: any): string {
    switch (message.type) {
      case 'image':
        return '📷 Imagem';
      case 'video':
        return '🎬 Vídeo';
      case 'audio':
        return '🎤 Áudio';
      case 'file':
        return '📎 Arquivo';
      case 'proposal':
        return '💼 Proposta comercial';
      case 'gif':
        return 'GIF';
      default:
        // Para texto, usar o plaintext se disponível, senão o ciphertext truncado
        if (message.plaintext) {
          return message.plaintext;
        }
        return 'Nova mensagem';
    }
  }

  /**
   * Envia edição de mensagem via WebSocket
   */
  sendMessageEdit(messageId: string, ciphertext: string) {
    this.send({ op: 'message:edit', data: { messageId, ciphertext } } as WsClientMsg);
  }

  /**
   * Envia deleção de mensagem via WebSocket
   */
  sendMessageDelete(messageId: string) {
    this.send({ op: 'message:delete', data: { messageId } } as WsClientMsg);
  }
}

export const chatWs = new ChatWebSocketClient();
