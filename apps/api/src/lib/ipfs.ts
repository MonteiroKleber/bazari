import { env } from '../env.js';
import { create } from 'kubo-rpc-client';

const DEFAULT_PLACEHOLDER = null;

export type IpfsFetchResult<T = unknown> = {
  metadata: T | null;
  source: 'stores' | 'registry' | 'placeholder';
};

const gatewayBase = env.IPFS_GATEWAY_URL?.endsWith('/') ? env.IPFS_GATEWAY_URL : `${env.IPFS_GATEWAY_URL}/`;
const timeoutMs = env.IPFS_TIMEOUT_MS ?? 2000;

// Cliente IPFS para publicação
const ipfsClient = env.IPFS_API_URL ? create({ url: env.IPFS_API_URL }) : null;

export async function fetchIpfsJson<T = unknown>(cid: string | null, sourceHint: 'stores' | 'registry' = 'stores'): Promise<IpfsFetchResult<T>> {
  if (!cid) {
    return { metadata: DEFAULT_PLACEHOLDER, source: 'placeholder' };
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${gatewayBase}${cid}`, { signal: controller.signal });
    if (!res.ok) {
      return { metadata: DEFAULT_PLACEHOLDER, source: 'placeholder' };
    }
    const json = await res.json() as T;
    return { metadata: json, source: sourceHint };
  } catch {
    return { metadata: DEFAULT_PLACEHOLDER, source: 'placeholder' };
  } finally {
    clearTimeout(id);
  }
}

// === Profile Metadata Types ===

export type ProfileMetadata = {
  schema_version: string;
  profile: {
    display_name: string;
    bio: string | null;
    avatar_cid: string | null;
    banner_cid: string | null;
    joined_at: string;
  };
  reputation: {
    score: number;
    tier: string;
    since: string;
  };
  badges: Array<{
    code: string;
    label: { pt: string; en: string; es: string };
    issued_by: string;
    issued_at: number;
  }>;
  penalties: Array<{
    code: string;
    reason: string;
    points: number;
    timestamp: number;
  }>;
  links: {
    website?: string;
    social?: Array<{ type: string; url: string }>;
  };
};

/**
 * Publica metadados de perfil no IPFS
 */
export async function publishProfileMetadata(
  data: ProfileMetadata
): Promise<string> {
  if (!ipfsClient) {
    // Desenvolvimento: gerar CID fake baseado em hash dos dados
    console.warn('[IPFS] IPFS client not configured, using fake CID for development');
    const json = JSON.stringify(data);
    const hash = Buffer.from(json).toString('base64').substring(0, 46);
    const fakeCid = `bafydev${hash.replace(/[+/=]/g, 'a')}`;
    console.log('[IPFS] Generated fake CID:', fakeCid);
    return fakeCid;
  }

  const json = JSON.stringify(data);
  const result = await ipfsClient.add(json);
  return result.cid.toString();
}

/**
 * Busca metadados de perfil do IPFS
 */
export async function fetchProfileMetadata(
  cid: string
): Promise<ProfileMetadata | null> {
  if (!ipfsClient) {
    // Fallback para gateway HTTP
    const result = await fetchIpfsJson<ProfileMetadata>(cid, 'stores');
    return result.metadata;
  }

  try {
    const chunks = [];
    for await (const chunk of ipfsClient.cat(cid)) {
      chunks.push(chunk);
    }
    const data = Buffer.concat(chunks).toString();
    return JSON.parse(data);
  } catch (error) {
    console.error('Error fetching profile metadata:', error);
    return null;
  }
}

/**
 * Cria metadados iniciais para um novo perfil
 */
export function createInitialMetadata(profile: {
  handle: string;
  displayName: string;
  createdAt: Date;
}): ProfileMetadata {
  return {
    schema_version: '1.0',
    profile: {
      display_name: profile.displayName,
      bio: null,
      avatar_cid: null,
      banner_cid: null,
      joined_at: profile.createdAt.toISOString(),
    },
    reputation: {
      score: 0,
      tier: 'bronze',
      since: profile.createdAt.toISOString(),
    },
    badges: [],
    penalties: [],
    links: {},
  };
}
