import { AuthClient } from './auth';
import { WalletClient } from './wallet';
import { StorageClient } from './storage';
import { UIClient } from './ui';
import { EventsClient } from './events';
import { isInsideBazari } from '../utils/bridge';

export interface BazariSDKOptions {
  /** Modo de debug */
  debug?: boolean;
}

/**
 * SDK principal do Bazari
 *
 * @example
 * ```typescript
 * import { BazariSDK } from '@bazari/app-sdk';
 *
 * const sdk = new BazariSDK();
 *
 * // Obter usuário atual
 * const user = await sdk.auth.getCurrentUser();
 *
 * // Verificar saldo
 * const balance = await sdk.wallet.getBalance();
 *
 * // Mostrar toast
 * await sdk.ui.success('Operação concluída!');
 * ```
 */
export class BazariSDK {
  /** API de autenticação */
  readonly auth: AuthClient;

  /** API de wallet */
  readonly wallet: WalletClient;

  /** API de storage */
  readonly storage: StorageClient;

  /** API de UI */
  readonly ui: UIClient;

  /** API de eventos */
  readonly events: EventsClient;

  /** Versão do SDK */
  static readonly VERSION = '0.1.0';

  private options: BazariSDKOptions;

  constructor(options: BazariSDKOptions = {}) {
    this.options = options;

    // Verificar se está no ambiente correto
    if (!isInsideBazari()) {
      if (options.debug) {
        console.warn(
          '[BazariSDK] Running outside Bazari platform. Some features may not work.'
        );
      }
    }

    // Inicializar clientes
    this.auth = new AuthClient();
    this.wallet = new WalletClient();
    this.storage = new StorageClient();
    this.ui = new UIClient();
    this.events = new EventsClient();

    if (options.debug) {
      console.log('[BazariSDK] Initialized', { version: BazariSDK.VERSION });
    }
  }

  /**
   * Verifica se está rodando dentro do Bazari
   */
  isInBazari(): boolean {
    return isInsideBazari();
  }

  /**
   * Obtém a versão do SDK
   */
  getVersion(): string {
    return BazariSDK.VERSION;
  }
}
