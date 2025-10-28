import { hexToU8a, isHex, u8aToString } from '@polkadot/util';
import { getApi } from './polkadot';

export interface AssetMetadata {
  assetId: string;
  symbol: string;
  decimals: number;
  name?: string;
  supply?: bigint;
  owner?: string;
}

const metadataCache = new Map<string, AssetMetadata>();

function normaliseId(assetId: string | number | bigint): string {
  if (typeof assetId === 'bigint') {
    return assetId.toString();
  }
  if (typeof assetId === 'number') {
    return assetId.toString(10);
  }
  return assetId.trim();
}

function decodeBytes(value: any): string {
  if (!value) {
    return '';
  }

  if (typeof value.toUtf8 === 'function') {
    const utf8 = value.toUtf8().trim();
    if (utf8) {
      return utf8;
    }
  }

  const str = typeof value.toString === 'function' ? value.toString().trim() : String(value).trim();
  if (str && str.startsWith('0x') && isHex(str)) {
    try {
      return u8aToString(hexToU8a(str)).trim();
    } catch (error) {
      console.warn('[wallet] Failed to decode hex bytes:', error);
    }
  }
  return str;
}

export async function fetchAssetMetadata(assetId: string | number | bigint): Promise<AssetMetadata | null> {
  const id = normaliseId(assetId);
  if (metadataCache.has(id)) {
    return metadataCache.get(id)!;
  }

  const api = await getApi();
  const assetInfo = await api.query.assets.asset(id);

  if ((assetInfo as any).isNone) {
    return null;
  }

  const metadata = await api.query.assets.metadata(id);
  const rawMetadata = (metadata as any).isSome ? (metadata as any).unwrap() : metadata;

  const name = decodeBytes(rawMetadata.name);
  const symbolDecoded = decodeBytes(rawMetadata.symbol);
  const symbol = symbolDecoded || `#${id}`;
  const decimals = rawMetadata.decimals?.toNumber?.() ?? Number(rawMetadata.decimals ?? 0);

  // Extract supply and owner from asset details
  const assetDetails = (assetInfo as any).isSome ? (assetInfo as any).unwrap() : assetInfo;
  const supply = assetDetails.supply ? BigInt(assetDetails.supply.toString()) : undefined;
  const owner = assetDetails.owner ? assetDetails.owner.toString() : undefined;

  const payload: AssetMetadata = {
    assetId: id,
    symbol,
    decimals: Number.isFinite(decimals) ? decimals : 0,
    name: name || undefined,
    supply,
    owner,
  };

  metadataCache.set(id, payload);
  return payload;
}

export function clearAssetMetadata(assetId?: string) {
  if (assetId) {
    metadataCache.delete(assetId);
    return;
  }
  metadataCache.clear();
}
