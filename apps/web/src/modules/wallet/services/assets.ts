import { getApi } from './polkadot';

export interface AssetMetadata {
  assetId: string;
  symbol: string;
  decimals: number;
  name?: string;
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

  const name = rawMetadata.name?.toString().trim();
  const symbol = rawMetadata.symbol?.toString?.().trim() || `#${id}`;
  const decimals = rawMetadata.decimals?.toNumber?.() ?? Number(rawMetadata.decimals ?? 0);

  const payload: AssetMetadata = {
    assetId: id,
    symbol,
    decimals: Number.isFinite(decimals) ? decimals : 0,
    name: name || undefined,
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
