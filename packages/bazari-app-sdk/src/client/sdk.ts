import { AuthClient } from './auth';
import { WalletClient } from './wallet';
import { StorageClient } from './storage';
import { UIClient } from './ui';
import { EventsClient } from './events';
import { ContractsClient } from './contracts';
import { LocationClient } from './location';
import { MapsClient } from './maps';
import { isInsideBazari, configureSDK, isConfigured, getSDKVersion } from '../utils/bridge';

export interface BazariSDKOptions {
  /**
   * API Key do app
   * Obrigatória para apps em produção
   * Opcional no Preview Mode (desenvolvimento)
   * Obtenha em: https://bazari.libervia.xyz/app/developer
   */
  apiKey?: string;

  /**
   * Secret Key do app (opcional, para HMAC signing)
   * Recomendado para apps que fazem operações sensíveis
   */
  secretKey?: string;

  /** Modo de debug */
  debug?: boolean;
}

/**
 * SDK principal do Bazari
 *
 * @example
 * ```typescript
 * import { BazariSDK } from '@bazari.libervia.xyz/app-sdk';
 *
 * // Inicializar com API Key (obrigatória)
 * const sdk = new BazariSDK({
 *   apiKey: 'baz_app_xxxxxxxxxxxxxxxx',
 *   secretKey: 'baz_secret_xxxxxxxxxxxxxxxx', // opcional
 *   debug: true,
 * });
 *
 * // Obter usuário atual
 * const user = await sdk.auth.getCurrentUser();
 *
 * // Verificar saldo
 * const balance = await sdk.wallet.getBalance();
 *
 * // Mostrar toast
 * await sdk.ui.success('Operação concluída!');
 *
 * // Deploy de contrato de fidelidade
 * const contract = await sdk.contracts.deployLoyalty({
 *   name: 'Pontos Café',
 *   symbol: 'PTC',
 *   bzrToPointsRatio: 100,
 *   pointsToBzrRatio: 100,
 * });
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

  /** API de contratos (ink!) */
  readonly contracts: ContractsClient;

  /** API de localização (GPS) */
  readonly location: LocationClient;

  /** API de mapas */
  readonly maps: MapsClient;

  /** Versão do SDK */
  static readonly VERSION = '0.2.0';

  private options: BazariSDKOptions;

  constructor(options: BazariSDKOptions = {}) {
    // API Key é opcional no Preview Mode (desenvolvimento dentro do Bazari)
    // Mas obrigatória para apps em produção rodando fora
    const inBazari = isInsideBazari();

    if (!options.apiKey && !inBazari) {
      console.warn(
        '[BazariSDK] No API Key provided. Running in development mode. ' +
        'For production, get your API Key at https://bazari.libervia.xyz/app/developer'
      );
    }

    // Validar formato da API Key se fornecida
    if (options.apiKey && !options.apiKey.startsWith('baz_app_') && !options.apiKey.startsWith('baz_test_')) {
      if (options.debug) {
        console.warn(
          '[BazariSDK] API Key format should start with "baz_app_" or "baz_test_"'
        );
      }
    }

    this.options = options;

    // Configurar credenciais no bridge (se fornecidas)
    configureSDK({
      apiKey: options.apiKey || '',
      secretKey: options.secretKey,
    });

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
    this.contracts = new ContractsClient();
    this.location = new LocationClient();
    this.maps = new MapsClient();

    if (options.debug) {
      console.log('[BazariSDK] Initialized', {
        version: BazariSDK.VERSION,
        apiKey: options.apiKey ? `${options.apiKey.substring(0, 12)}...` : '(none - dev mode)',
        hasSecretKey: !!options.secretKey,
      });
    }
  }

  /**
   * Verifica se está rodando dentro do Bazari
   */
  isInBazari(): boolean {
    return isInsideBazari();
  }

  /**
   * Verifica se o SDK está configurado corretamente
   */
  isConfigured(): boolean {
    return isConfigured();
  }

  /**
   * Obtém a versão do SDK
   */
  getVersion(): string {
    return getSDKVersion();
  }
}
