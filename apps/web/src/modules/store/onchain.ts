import { getPublicJSON } from '@/lib/api';
import { getApi } from '@/modules/wallet/services/polkadot';
import type { StoreTheme } from './StoreLayout';

const DEFAULT_IPFS_GATEWAY = 'https://ipfs.io/ipfs/';
const DEFAULT_IPFS_API = 'http://127.0.0.1:5001/api/v0/add';

const gatewayFromEnv = (() => {
  const value = (import.meta as any)?.env?.VITE_IPFS_GATEWAY_URL ?? DEFAULT_IPFS_GATEWAY;
  if (typeof value !== 'string' || value.trim().length === 0) return DEFAULT_IPFS_GATEWAY;
  return value.endsWith('/') ? value : `${value}/`;
})();

const ipfsApiEndpoint = (() => {
  const value = (import.meta as any)?.env?.VITE_IPFS_API_URL ?? DEFAULT_IPFS_API;
  if (typeof value !== 'string' || value.trim().length === 0) return DEFAULT_IPFS_API;
  return value;
})();

const ipfsAuthorizationHeader = (() => {
  const value = (import.meta as any)?.env?.VITE_IPFS_API_AUTH_HEADER;
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  const [headerKey, ...rest] = value.split(':');
  if (!headerKey || rest.length === 0) return null;
  return {
    key: headerKey.trim(),
    value: rest.join(':').trim(),
  } as const;
})();

export type RawStoreMetadata = {
  version?: string;
  name?: string;
  description?: string;
  cover?: string | { url?: string | null } | null;
  categories?: string[];
  links?: Record<string, unknown> | null;
  theme?: Partial<StoreTheme> | null;
  [key: string]: unknown;
} | null;

export interface OnChainReputation {
  sales: number;
  positive: number;
  negative: number;
  volumePlanck: string;
}

export interface OnChainStoreResponse {
  storeId: string;
  owner: string;
  operators: string[];
  reputation: OnChainReputation;
  cid: string | null;
  metadata: RawStoreMetadata;
  source: 'registry' | 'stores' | 'placeholder';
}

export interface NormalizedLink {
  key: string;
  url: string;
}

export interface NormalizedMetadata {
  name: string;
  description?: string;
  coverUrl?: string;
  categories: string[][];
  links: NormalizedLink[];
  theme?: StoreTheme;
  raw: RawStoreMetadata;
}

export interface NormalizedOnChainStore {
  payload: OnChainStoreResponse;
  metadata: NormalizedMetadata;
}

export interface StoreMetadataPayload {
  version: string;
  name: string;
  description?: string;
  cover?: string | { url?: string | null } | null;
  categories: string[];
  links?: Record<string, unknown> | null;
  theme?: Partial<StoreTheme> | null;
}

export interface BuildMetadataInput {
  name: string;
  description?: string;
  categories: string[][];
  theme?: StoreTheme | null;
  coverUrl?: string | null;
  links?: Record<string, unknown> | null;
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function parseCategoryEntry(entry: unknown): string[] {
  if (typeof entry !== 'string' || entry.trim().length === 0) return [];
  const withoutPrefix = entry.includes(':') ? entry.split(':').slice(-1)[0] : entry;
  return withoutPrefix
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.replace(/[-_]/g, ' '))
    .map(capitalize);
}

type CoverLike = string | { url?: string | null } | null | undefined;
type LinksLike = Record<string, unknown> | null | undefined;
type ThemeLike = Partial<StoreTheme> | null | undefined;

function resolveCoverUrl(cover: CoverLike): string | undefined {
  if (!cover) return undefined;
  const raw = typeof cover === 'string' ? cover : cover?.url;
  if (!raw) return undefined;
  if (raw.startsWith('ipfs://')) {
    return `${gatewayFromEnv}${raw.slice('ipfs://'.length)}`;
  }
  return raw;
}

function normalizeLinks(links: LinksLike): NormalizedLink[] {
  if (!links || typeof links !== 'object') return [];
  const result: NormalizedLink[] = [];
  for (const [key, value] of Object.entries(links)) {
    if (typeof value === 'string' && value.trim().length > 0) {
      result.push({ key, url: value.trim() });
    } else if (value && typeof value === 'object') {
      for (const [subKey, subValue] of Object.entries(value)) {
        if (typeof subValue === 'string' && subValue.trim().length > 0) {
          result.push({ key: `${key}.${subKey}`, url: subValue.trim() });
        }
      }
    }
  }
  return result;
}

function normalizeTheme(theme: ThemeLike): StoreTheme | undefined {
  if (!theme || typeof theme !== 'object') return undefined;
  const keys: (keyof StoreTheme)[] = ['bg', 'ink', 'brand', 'accent'];
  const normalized: StoreTheme = {};
  let touched = false;
  for (const key of keys) {
    const value = (theme as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      normalized[key] = value.trim();
      touched = true;
    }
  }
  return touched ? normalized : undefined;
}

function toNormalizedMetadata(storeId: string, metadata: RawStoreMetadata): NormalizedMetadata {
  const name = typeof metadata?.name === 'string' && metadata.name.trim().length > 0
    ? metadata.name.trim()
    : `Loja ${storeId}`;
  const description = typeof metadata?.description === 'string' && metadata.description.trim().length > 0
    ? metadata.description.trim()
    : undefined;
  const categoriesSource = Array.isArray(metadata?.categories) ? metadata?.categories : [];
  const categories = categoriesSource
    .map(parseCategoryEntry)
    .filter((entry) => entry.length > 0)
    .slice(0, 12);
  const coverUrl = resolveCoverUrl(metadata?.cover as any);
  const links = normalizeLinks(metadata?.links as any);
  const theme = normalizeTheme(metadata?.theme as any);

  return {
    name,
    description,
    coverUrl,
    categories,
    links,
    theme,
    raw: metadata,
  };
}

export async function fetchOnChainStore(storeId: string | number): Promise<NormalizedOnChainStore> {
  const id = String(storeId);
  const response = await getPublicJSON<OnChainStoreResponse>(`/stores/${encodeURIComponent(id)}`);
  const metadata = toNormalizedMetadata(id, response.metadata ?? null);
  return {
    payload: response,
    metadata,
  };
}

export function resolveIpfsUrl(cidOrUrl?: string | null): string | undefined {
  if (!cidOrUrl) return undefined;
  if (cidOrUrl.startsWith('ipfs://')) {
    return `${gatewayFromEnv}${cidOrUrl.slice('ipfs://'.length)}`;
  }
  if (/^[A-Za-z0-9]{46,}$/.test(cidOrUrl)) {
    return `${gatewayFromEnv}${cidOrUrl}`;
  }
  return cidOrUrl;
}

function toMetadataCategory(parts: string[]): string | null {
  if (!Array.isArray(parts) || parts.length === 0) return null;
  const trimmed = parts.map((entry) => entry.trim()).filter(Boolean);
  if (trimmed.length === 0) return null;

  const [first, ...rest] = trimmed;
  if (first.includes(':')) {
    const [namespace, ...after] = first.split(':').map((entry) => entry.trim()).filter(Boolean);
    if (!namespace) return null;
    if (after.length === 0 && rest.length === 0) return namespace;
    const tail = [...after, ...rest].filter(Boolean);
    return tail.length > 0 ? `${namespace}:${tail.join('/')}` : namespace;
  }

  if (rest.length === 0) {
    return first;
  }
  return `${first}:${rest.join('/')}`;
}

export function buildStoreMetadata(input: BuildMetadataInput): StoreMetadataPayload {
  const categories = Array.from(
    new Set(
      (input.categories ?? [])
        .map(toMetadataCategory)
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
    )
  );

  const payload: StoreMetadataPayload = {
    version: '1.0.0',
    name: input.name,
    description: input.description?.trim() || undefined,
    categories,
  };

  if (input.coverUrl) {
    payload.cover = input.coverUrl;
  }
  if (input.theme) {
    payload.theme = input.theme;
  }
  if (input.links && Object.keys(input.links).length > 0) {
    payload.links = input.links;
  }

  return payload;
}

export async function uploadMetadataToIpfs(metadata: StoreMetadataPayload, signal?: AbortSignal): Promise<string> {
  const form = new FormData();
  const blob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
  form.append('file', blob, 'store.json');

  const headers = new Headers({ Accept: 'application/json' });
  if (ipfsAuthorizationHeader) {
    headers.set(ipfsAuthorizationHeader.key, ipfsAuthorizationHeader.value);
  }

  const response = await fetch(ipfsApiEndpoint, {
    method: 'POST',
    body: form,
    headers,
    signal,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`Falha ao enviar metadados para o IPFS (${response.status}): ${message}`);
  }

  const text = await response.text();
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      const parsed = JSON.parse(lines[i]);
      const candidates = [parsed.Hash, parsed.cid, parsed.Cid?.['/']];
      const cid = candidates.find((value: unknown): value is string => typeof value === 'string' && value.length > 0);
      if (cid) {
        return cid;
      }
    } catch {
      // ignore json parse errors and continue
    }
  }

  throw new Error('Resposta do IPFS não contém CID válido');
}

export async function getCreationDeposit(): Promise<bigint> {
  const api = await getApi();
  const constant = (api.consts as any)?.stores?.creationDeposit;
  if (!constant) return 0n;
  try {
    return BigInt(constant.toString());
  } catch {
    return 0n;
  }
}

export async function getPendingTransfer(storeId: string | number): Promise<string | null> {
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
