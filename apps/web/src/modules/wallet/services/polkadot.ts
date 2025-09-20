import { ApiPromise, WsProvider } from '@polkadot/api';

const WS_ENDPOINT = import.meta.env.VITE_BAZARICHAIN_WS || 'ws://127.0.0.1:9944';
const RETRY_BASE_DELAY = 1000;
const RETRY_MAX_DELAY = 15_000;

interface ChainProps {
  ss58Prefix: number;
  tokenSymbol: string;
  tokenDecimals: number;
}

let apiInstance: ApiPromise | null = null;
let connectPromise: Promise<ApiPromise> | null = null;
let cachedChainProps: ChainProps | null = null;

function wait(delay: number) {
  return new Promise((resolve) => setTimeout(resolve, delay));
}

async function createApi(attempt = 0): Promise<ApiPromise> {
  const provider = new WsProvider(WS_ENDPOINT, Math.min(RETRY_BASE_DELAY * 2 ** attempt, RETRY_MAX_DELAY));

  try {
    const api = await ApiPromise.create({ provider });
    await api.isReadyOrError;

    api.on('disconnected', () => {
      connectPromise = null;
    });

    api.on('error', (error) => {
      console.error('[wallet] Polkadot API error:', error);
    });

    return api;
  } catch (error) {
    console.error('[wallet] Failed to connect to Bazarichain node:', error);
    try {
      await provider.disconnect();
    } catch (disconnectError) {
      console.warn('[wallet] Failed to cleanly disconnect provider:', disconnectError);
    }

    const delay = Math.min(RETRY_BASE_DELAY * 2 ** attempt, RETRY_MAX_DELAY);
    await wait(delay);
    return createApi(attempt + 1);
  }
}

export async function getApi(): Promise<ApiPromise> {
  if (apiInstance) {
    return apiInstance;
  }

  if (connectPromise) {
    return connectPromise;
  }

  connectPromise = createApi();
  apiInstance = await connectPromise;
  connectPromise = null;
  return apiInstance;
}

export async function getChainProps(): Promise<ChainProps> {
  if (cachedChainProps) {
    return cachedChainProps;
  }

  const api = await getApi();
  const properties = await api.rpc.system.properties();

  const ss58Prefix = properties.ss58Format.isSome
    ? properties.ss58Format.unwrap().toNumber()
    : api.registry.chainSS58 ?? 42;

  const tokenSymbol = properties.tokenSymbol.isSome
    ? properties.tokenSymbol
        .unwrap()
        .map((symbol) => symbol.toString())
        .filter(Boolean)[0] ?? 'BZR'
    : api.registry.chainTokens?.[0] ?? 'BZR';

  const tokenDecimals = properties.tokenDecimals.isSome
    ? properties.tokenDecimals.unwrap().map((value) => value.toNumber())[0] ?? 12
    : api.registry.chainDecimals?.[0] ?? 12;

  cachedChainProps = {
    ss58Prefix: typeof ss58Prefix === 'number' ? ss58Prefix : 42,
    tokenSymbol,
    tokenDecimals,
  };

  return cachedChainProps;
}

export async function disconnectApi() {
  if (apiInstance) {
    await apiInstance.disconnect();
    apiInstance = null;
  }
  connectPromise = null;
  cachedChainProps = null;
}

export type { ChainProps };
