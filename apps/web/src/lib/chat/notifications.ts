/**
 * Chat Notification Service
 * Gerencia notificações push do navegador para novas mensagens
 */

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  threadId?: string;
  messageId?: string;
}

class ChatNotificationService {
  private permission: NotificationPermission = 'default';
  private enabled: boolean = true;

  constructor() {
    // Verificar permissão atual
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }

    // Carregar preferência do usuário
    const saved = localStorage.getItem('chat_notifications_enabled');
    this.enabled = saved !== 'false';
  }

  /**
   * Verifica se as notificações são suportadas
   */
  isSupported(): boolean {
    return 'Notification' in window;
  }

  /**
   * Retorna a permissão atual
   */
  getPermission(): NotificationPermission {
    return this.permission;
  }

  /**
   * Verifica se as notificações estão habilitadas pelo usuário
   */
  isEnabled(): boolean {
    // Sempre verificar a permissão atual do navegador
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
    return this.enabled && this.permission === 'granted';
  }

  /**
   * Habilita/desabilita notificações
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    localStorage.setItem('chat_notifications_enabled', String(enabled));
  }

  /**
   * Solicita permissão ao usuário
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('[Notifications] Not supported in this browser');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      this.permission = result;
      return result === 'granted';
    } catch (err) {
      console.error('[Notifications] Permission request failed:', err);
      return false;
    }
  }

  /**
   * Verifica se a aba está em foco
   */
  private isTabFocused(): boolean {
    return document.visibilityState === 'visible' && document.hasFocus();
  }

  /**
   * Exibe uma notificação
   * @param options - Opções da notificação
   * @param forceShow - Se true, mostra mesmo com a aba em foco (para testes)
   */
  async showNotification(options: NotificationOptions, forceShow = false): Promise<void> {
    // Não mostrar se:
    // - Não tem permissão
    // - Notificações desabilitadas
    if (!this.isEnabled()) {
      return;
    }

    // Não mostrar se tab em foco (a menos que forceShow)
    if (!forceShow && this.isTabFocused()) {
      return;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icons/icon-192.png',
        tag: options.tag || options.threadId || 'chat-message',
        badge: '/icons/badge-72.png',
        silent: true, // Som é gerenciado separadamente
        requireInteraction: false,
        data: {
          threadId: options.threadId,
          messageId: options.messageId,
        },
      });

      // Clicar na notificação abre a conversa
      notification.onclick = () => {
        window.focus();
        if (options.threadId) {
          window.location.href = `/app/chat/${options.threadId}`;
        }
        notification.close();
      };

      // Auto-fechar após 5 segundos
      setTimeout(() => {
        notification.close();
      }, 5000);

    } catch (err) {
      console.error('[Notifications] Failed to show notification:', err);
    }
  }

  /**
   * Notifica sobre nova mensagem de chat
   */
  async notifyNewMessage(
    senderName: string,
    messagePreview: string,
    threadId: string,
    messageId: string,
  ): Promise<void> {
    await this.showNotification({
      title: senderName,
      body: messagePreview.length > 100
        ? messagePreview.substring(0, 100) + '...'
        : messagePreview,
      threadId,
      messageId,
      tag: `chat-${threadId}`, // Agrupa notificações da mesma conversa
    });
  }
}

export const chatNotificationService = new ChatNotificationService();
