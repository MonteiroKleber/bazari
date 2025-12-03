import { sendMessage } from '../utils/bridge';

type EventCallback<T = unknown> = (data: T) => void;

/**
 * API de Events do SDK
 * Permite escutar eventos do Bazari
 */
export class EventsClient {
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private initialized = false;

  constructor() {
    this.setupEventListener();
  }

  private setupEventListener() {
    if (this.initialized || typeof window === 'undefined') return;

    window.addEventListener('message', (event) => {
      const data = event.data;

      // Verificar se é um evento do host
      if (data?.type?.startsWith('event:')) {
        const eventType = data.type.replace('event:', '');
        this.emit(eventType, data.data);
      }
    });

    this.initialized = true;
  }

  private emit(eventType: string, data: unknown) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  /**
   * Inscreve-se em um tipo de evento
   */
  async on<T = unknown>(
    eventType: string,
    callback: EventCallback<T>
  ): Promise<() => void> {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
      // Notificar host que queremos receber esse evento
      await sendMessage('events:subscribe', { eventType });
    }

    this.listeners.get(eventType)!.add(callback as EventCallback);

    // Retorna função para cancelar inscrição
    return () => this.off(eventType, callback);
  }

  /**
   * Remove inscrição de um evento
   */
  async off<T = unknown>(
    eventType: string,
    callback: EventCallback<T>
  ): Promise<void> {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.delete(callback as EventCallback);

      if (callbacks.size === 0) {
        this.listeners.delete(eventType);
        await sendMessage('events:unsubscribe', { eventType });
      }
    }
  }

  /**
   * Inscreve-se uma única vez em um evento
   */
  async once<T = unknown>(
    eventType: string,
    callback: EventCallback<T>
  ): Promise<void> {
    const wrapper: EventCallback<T> = (data) => {
      callback(data);
      this.off(eventType, wrapper);
    };
    await this.on(eventType, wrapper);
  }
}

// Eventos disponíveis
export type BazariEvent =
  | 'wallet:transaction'
  | 'wallet:balanceChanged'
  | 'user:profileUpdated'
  | 'app:activated'
  | 'app:deactivated';
