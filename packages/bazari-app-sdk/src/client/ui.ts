import { sendMessage } from '../utils/bridge';
import type { SDKConfirmResult } from '../types/responses';

export interface ToastOptions {
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export interface ModalOptions {
  title: string;
  content: string;
}

/**
 * API de UI do SDK
 * Permite usar componentes nativos do Bazari
 */
export class UIClient {
  /**
   * Mostra um toast notification
   */
  async showToast(
    message: string,
    options?: ToastOptions
  ): Promise<void> {
    await sendMessage('ui:showToast', {
      message,
      type: options?.type || 'info',
      duration: options?.duration || 3000,
    });
  }

  /**
   * Mostra diálogo de confirmação
   * @returns true se usuário confirmou, false se cancelou
   */
  async showConfirm(options: ConfirmOptions): Promise<boolean> {
    const result = await sendMessage('ui:showConfirm', options);
    return (result as SDKConfirmResult).confirmed;
  }

  /**
   * Mostra modal com conteúdo
   */
  async showModal(options: ModalOptions): Promise<void> {
    await sendMessage('ui:showModal', options);
  }

  /**
   * Fecha modal atual
   */
  async closeModal(): Promise<void> {
    await sendMessage('ui:closeModal', undefined);
  }

  // Helpers
  async success(message: string): Promise<void> {
    return this.showToast(message, { type: 'success' });
  }

  async error(message: string): Promise<void> {
    return this.showToast(message, { type: 'error' });
  }

  async warning(message: string): Promise<void> {
    return this.showToast(message, { type: 'warning' });
  }

  async info(message: string): Promise<void> {
    return this.showToast(message, { type: 'info' });
  }
}
