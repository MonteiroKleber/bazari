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

function getCollectionId(api: ApiPromise): bigint {
  const constValue = (api.consts as any)?.stores?.bazariStoresCollectionId;
  if (constValue) {
    try {
      return BigInt(constValue.toString());
    } catch {}
  }
  return BigInt(1000);
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
  const collectionId = getCollectionId(api);
  const itemId = api.createType('u64', storeId.toString());
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
    api.query.stores.operators(storeId.toString()) as Promise<Vec<any>>,
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
    const metadataRaw = (await api.query.stores.metadataCid(storeIdStr)) as Option<any>;
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
  const decoded = decodeAddress(address);
  const collectionId = getCollectionId(api);
  const keys = await api.query.uniques.account.keys(decoded, api.createType('u32', collectionId.toString()));
  return keys.map((key) => key.args[2].toString());
}

async function listOperatedStoreIds(api: ApiPromise, address: string): Promise<string[]> {
  await ensureCryptoReady();
  const decoded = decodeAddress(address);
  const target = encodeAddress(decoded);
  const entries = (await api.query.stores.operators.entries()) as Array<[StorageKey<[any]>, Vec<any>]>;
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

export function storesRegistryEnabled() {
  return REGISTRY_ENABLED;
}
