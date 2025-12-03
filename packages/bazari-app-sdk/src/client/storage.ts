import { sendMessage } from '../utils/bridge';

/**
 * API de Storage do SDK
 * Dados ficam isolados por app
 */
export class StorageClient {
  /**
   * Obtém um valor do storage
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    const result = await sendMessage('storage:get', { key });
    return result as T | null;
  }

  /**
   * Salva um valor no storage
   */
  async set(key: string, value: unknown): Promise<void> {
    await sendMessage('storage:set', { key, value });
  }

  /**
   * Remove um valor do storage
   */
  async remove(key: string): Promise<void> {
    await sendMessage('storage:remove', { key });
  }

  /**
   * Limpa todo o storage do app
   */
  async clear(): Promise<void> {
    await sendMessage('storage:clear', undefined);
  }

  /**
   * Obtém valor com fallback
   */
  async getOrDefault<T>(key: string, defaultValue: T): Promise<T> {
    const result = await this.get<T>(key);
    return result ?? defaultValue;
  }
}
