import '@polkadot/api-augment';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { env } from '../env.js';

const WS_ENDPOINT = env.BAZARICHAIN_WS ?? 'ws://127.0.0.1:9944';

let apiPromise: Promise<ApiPromise> | null = null;
let cryptoReady: Promise<boolean> | null = null;

async function ensureCryptoReady() {
  if (!cryptoReady) {
    cryptoReady = cryptoWaitReady();
  }
  await cryptoReady;
}

/**
 * Obtém uma instância singleton do ApiPromise conectado ao Substrate
 */
export async function getSubstrateApi(): Promise<ApiPromise> {
  await ensureCryptoReady();

  if (!apiPromise) {
    console.log('[Substrate] Creating API connection to:', WS_ENDPOINT);

    try {
      const provider = new WsProvider(WS_ENDPOINT, false);

      console.log('[Substrate] Connecting to WebSocket...');
      await Promise.race([
        provider.connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('WebSocket connection timeout')), 10000)
        ),
      ]);

      console.log('[Substrate] WebSocket connected, creating ApiPromise...');

      provider.on('disconnected', () => {
        console.log('[Substrate] WebSocket disconnected');
        apiPromise = null;
      });

      provider.on('error', (err) => {
        console.error('[Substrate] WebSocket error:', err);
      });

      apiPromise = ApiPromise.create({ provider }).then((api) => {
        console.log('[Substrate] API ready, chain:', api.runtimeChain.toString());
        return api;
      });
    } catch (error) {
      console.error('[Substrate] Failed to create API:', error);
      apiPromise = null;
      throw error;
    }
  }

  return apiPromise;
}

/**
 * Desconecta e limpa a API
 */
export async function disconnectSubstrateApi() {
  if (apiPromise) {
    const api = await apiPromise;
    await api.disconnect();
    apiPromise = null;
    console.log('[Substrate] API disconnected');
  }
}
