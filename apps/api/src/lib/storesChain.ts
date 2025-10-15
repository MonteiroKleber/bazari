import '@polkadot/api-augment';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { encodeAddress, decodeAddress, cryptoWaitReady } from '@polkadot/util-crypto';
import { u8aToString, hexToString } from '@polkadot/util';
import type { Option, Vec } from '@polkadot/types';
import type { StorageKey } from '@polkadot/types';
import { env } from '../env.js';

const WS_ENDPOINT = env.BAZARICHAIN_WS ?? 'ws://127.0.0.1:9944';
const REGISTRY_ENABLED = env.STORES_REGISTRY_ENABLED ?? false;

export type StoreCidSource = 'registry' | 'stores' | 'placeholder';
export type StoreCidResolution = { cid: string | null; source: StoreCidSource };

let apiPromise: Promise<ApiPromise> | null = null;
let cryptoReady: Promise<boolean> | null = null;

async function ensureCryptoReady() {
  if (!cryptoReady) {
    cryptoReady = cryptoWaitReady();
  }
  await cryptoReady;
}

async function getApi(): Promise<ApiPromise> {
  await ensureCryptoReady();
  if (!apiPromise) {
    apiPromise = ApiPromise.create({ provider: new WsProvider(WS_ENDPOINT) }).then((api) => {
      api.on('disconnected', () => {
        apiPromise = null;
      });
      api.on('error', () => {
        apiPromise = null;
      });
      return api;
    });
  }
  return apiPromise;
}

export async function getStoresApi(): Promise<ApiPromise> {
  return getApi();
}

async function getStoreCollectionId(api: ApiPromise, storeId: bigint): Promise<bigint | null> {
  try {
    const v = await (api.query as any)?.stores?.storeCollection?.(storeId.toString());
    if (!v) return null;
    const s = v.toString?.() ?? String(v);
    if (!s) return null;
    return BigInt(s);
  } catch {
    return null;
  }
}

function cidFromBytes(cid: Uint8Array): string | null {
  if (!cid || cid.length === 0) return null;
  try {
    return u8aToString(cid);
  } catch {
    try {
      return hexToString(cid as any);
    } catch {}
  }
  return null;
}

function accountToSs58(account: any): string {
  const bytes = account instanceof Uint8Array ? account : account.toU8a ? account.toU8a() : account;
  return encodeAddress(bytes);
}

async function fetchStoreFromChain(api: ApiPromise, storeId: bigint) {
  const itemId = api.createType('u64', storeId.toString());
  const collectionId = await getStoreCollectionId(api, storeId);
  if (collectionId === null) return null;
  const collection = api.createType('u32', collectionId.toString());

  const uniquesQuery: any = (api.query as any)?.uniques;
  if (!uniquesQuery) {
    throw new Error('pallet_uniques not available in runtime');
  }

  const itemOption: Option<any> = uniquesQuery.asset
    ? ((await uniquesQuery.asset(collection, itemId)) as Option<any>)
    : ((await uniquesQuery.item(collection, itemId)) as Option<any>);

  if (!itemOption || itemOption.isNone) {
    return null;
  }

  const itemValue = itemOption.unwrap() as any;
  const ownerValue = itemValue.owner ?? itemValue.ownerId ?? itemValue.account;
  if (!ownerValue) {
    throw new Error('Unable to resolve owner from uniques storage');
  }
  const owner = accountToSs58(ownerValue);

  const [operatorsRaw, reputationRaw] = await Promise.all([
    api.query.stores.operators(storeId.toString()) as unknown as Promise<Vec<any>>,
    api.query.stores.reputation(storeId.toString()),
  ]);

  const operators = operatorsRaw ? operatorsRaw.toArray().map((op: any) => accountToSs58(op)) : [];
  const reputationJson = reputationRaw ? (reputationRaw as any).toJSON?.() ?? {} : {};

  return {
    storeId: storeId.toString(),
    owner,
    operators,
    reputation: {
      sales: Number(reputationJson.sales ?? 0),
      positive: Number(reputationJson.positive ?? 0),
      negative: Number(reputationJson.negative ?? 0),
      volumePlanck: reputationJson.volume_planck !== undefined ? BigInt(reputationJson.volume_planck).toString() : '0',
    },
  } as const;
}

async function getRegistryHead(api: ApiPromise, namespace: string): Promise<Option<any> | null> {
  try {
    const query = (api.query as any)?.universalRegistry?.headByNamespace;
    if (!query) return null;
    return (await query(namespace)) as Option<any>;
  } catch {
    return null;
  }
}

export async function resolveStoreCidWithSource(storeId: string | number, apiArg?: ApiPromise): Promise<StoreCidResolution> {
  const api = apiArg ?? (await getApi());
  const storeIdStr = storeId.toString();

  if (storesRegistryEnabled()) {
    const namespace = `stores/${storeIdStr}`;
    const headOption = await getRegistryHead(api, namespace);
    if (headOption && headOption.isSome) {
      const head = headOption.unwrap() as any;
      const cidBytes = head?.cid ?? head;
      const cid = cidFromBytes(cidBytes as Uint8Array);
      if (cid) {
        return { cid, source: 'registry' };
      }
    }
  }

  try {
    const metadataRaw = (await api.query.stores.metadataCid(storeIdStr)) as unknown as Option<any>;
    if (metadataRaw && metadataRaw.isSome) {
      const cid = cidFromBytes(metadataRaw.unwrap() as Uint8Array);
      if (cid) {
        return { cid, source: 'stores' };
      }
    }
  } catch {
    // ignore and fallback to placeholder
  }

  return { cid: null, source: 'placeholder' };
}

async function listOwnedStoreIds(api: ApiPromise, address: string): Promise<string[]> {
  await ensureCryptoReady();
  // Read on-chain index of stores by owner
  try {
    const storesVec = (await (api.query as any)?.stores?.ownerStores?.(address)) as Vec<any>;
    if (!storesVec) return [];
    return storesVec.toArray().map((x: any) => x.toString());
  } catch {
    return [];
  }
}

async function listOperatedStoreIds(api: ApiPromise, address: string): Promise<string[]> {
  await ensureCryptoReady();
  const decoded = decodeAddress(address);
  const target = encodeAddress(decoded);
  const entries = (await api.query.stores.operators.entries()) as unknown as Array<[StorageKey<[any]>, Vec<any>]>;
  const storeIds: string[] = [];
  for (const [key, value] of entries) {
    const raw = value as Vec<any>;
    const opsArray = raw?.toArray ? raw.toArray() : [];
    const hasOperator = opsArray.some((op: any) => accountToSs58(op) === target);
    if (hasOperator) {
      const id = key.args[0].toString();
      storeIds.push(id);
    }
  }
  return storeIds;
}

export async function getStore(storeId: string | number) {
  const api = await getApi();
  const storeIdBig = BigInt(storeId);
  const store = await fetchStoreFromChain(api, storeIdBig);
  if (!store) return null;
  return store;
}

export async function listStoresOwned(address: string) {
  const api = await getApi();
  return listOwnedStoreIds(api, address);
}

export async function listStoresOperated(address: string) {
  const api = await getApi();
  return listOperatedStoreIds(api, address);
}

export async function getPendingTransfer(storeId: string | number | bigint): Promise<string | null> {
  const api = await getApi();
  try {
    const value = await (api.query as any)?.stores?.pendingTransfer?.(storeId.toString());
    if (!value || value.isNone) return null;
    const unwrapped = value.unwrap();
    return typeof unwrapped.toString === 'function' ? unwrapped.toString() : String(unwrapped);
  } catch {
    return null;
  }
}

export async function listStoresWithPendingTransferTo(address: string): Promise<bigint[]> {
  const api = await getApi();
  const storesWithTransfer: bigint[] = [];

  try {
    // Buscar todas as entradas de pendingTransfer
    const entries = await (api.query as any).stores.pendingTransfer.entries();

    for (const [key, value] of entries) {
      if (value.isNone) continue;

      const pendingAddress = value.unwrap().toString();
      if (pendingAddress === address) {
        // Extrair storeId da chave
        const storeId = key.args[0].toString();
        storesWithTransfer.push(BigInt(storeId));
      }
    }
  } catch (e) {
    console.error('[storesChain] Error listing stores with pending transfer:', e);
  }

  return storesWithTransfer;
}

export function storesRegistryEnabled() {
  return REGISTRY_ENABLED;
}
