import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@polkadot/util-crypto', () => ({
  cryptoWaitReady: vi.fn(() => Promise.resolve(true)),
  decodeAddress: vi.fn((addr: string) => {
    if (addr === 'invalid-address') {
      throw new Error('Invalid decoded address');
    }
    return new Uint8Array(32);
  }),
  encodeAddress: vi.fn(() => '5encoded'),
}));

vi.mock('../env.js', () => ({
  env: {
    STORE_ONCHAIN_V1: true,
    BAZARICHAIN_WS: 'ws://127.0.0.1:9944',
    IPFS_GATEWAY_URL: 'https://ipfs.io/ipfs/',
    IPFS_TIMEOUT_MS: 2000,
    STORES_REGISTRY_ENABLED: false,
  },
}));

vi.mock('../lib/storesChain.js', () => ({
  getStore: vi.fn(),
  listStoresOwned: vi.fn(),
  listStoresOperated: vi.fn(),
  resolveStoreCidWithSource: vi.fn(),
}));

vi.mock('../lib/ipfs.js', () => ({
  fetchIpfsJson: vi.fn(),
}));

import Fastify from 'fastify';
import { storesRoutes } from './stores.js';
import { env } from '../env.js';
import {
  getStore,
  listStoresOwned,
  listStoresOperated,
  resolveStoreCidWithSource,
} from '../lib/storesChain.js';
import { fetchIpfsJson } from '../lib/ipfs.js';

const mockedGetStore = getStore as unknown as Mock;
const mockedListOwned = listStoresOwned as unknown as Mock;
const mockedListOperated = listStoresOperated as unknown as Mock;
const mockedFetchIpfs = fetchIpfsJson as unknown as Mock;
const mockedResolveCid = resolveStoreCidWithSource as unknown as Mock;

describe('stores routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    vi.clearAllMocks();
    env.STORES_REGISTRY_ENABLED = false;
    app = Fastify();
    await app.register(storesRoutes, { prisma: {} as any });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns store data with metadata quando registry desabilitado', async () => {
    env.STORES_REGISTRY_ENABLED = false;
    mockedGetStore.mockResolvedValueOnce({
      storeId: '1',
      owner: '5Alice',
      operators: ['5Bob'],
      reputation: { sales: 2, positive: 2, negative: 0, volumePlanck: '10' },
    });
    mockedResolveCid.mockResolvedValueOnce({ cid: 'cid123', source: 'stores' });
    mockedFetchIpfs.mockResolvedValueOnce({ metadata: { name: 'Loja' }, source: 'stores' });

    const res = await app.inject({ method: 'GET', url: '/stores/1' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.storeId).toBe('1');
    expect(body.owner).toBe('5Alice');
    expect(body.operators).toEqual(['5Bob']);
    expect(body.metadata).toEqual({ name: 'Loja' });
    expect(body.source).toBe('stores');
  });

  it('retorna metadata do registry quando HEAD disponível', async () => {
    env.STORES_REGISTRY_ENABLED = true;
    mockedGetStore.mockResolvedValueOnce({
      storeId: '2',
      owner: '5Carol',
      operators: [],
      reputation: { sales: 1, positive: 1, negative: 0, volumePlanck: '5' },
    });
    mockedResolveCid.mockResolvedValueOnce({ cid: 'cid-registry', source: 'registry' });
    mockedFetchIpfs.mockResolvedValueOnce({ metadata: { name: 'Registry store' }, source: 'registry' });

    const res = await app.inject({ method: 'GET', url: '/stores/2' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.cid).toBe('cid-registry');
    expect(body.source).toBe('registry');
    expect(body.metadata).toEqual({ name: 'Registry store' });
  });

  it('faz fallback para stores quando registry não retorna HEAD', async () => {
    env.STORES_REGISTRY_ENABLED = true;
    mockedGetStore.mockResolvedValueOnce({
      storeId: '3',
      owner: '5Dave',
      operators: [],
      reputation: { sales: 0, positive: 0, negative: 0, volumePlanck: '0' },
    });
    mockedResolveCid.mockResolvedValueOnce({ cid: 'cid-stores', source: 'stores' });
    mockedFetchIpfs.mockResolvedValueOnce({ metadata: { name: 'Fallback store' }, source: 'stores' });

    const res = await app.inject({ method: 'GET', url: '/stores/3' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.cid).toBe('cid-stores');
    expect(body.source).toBe('stores');
    expect(mockedFetchIpfs).toHaveBeenCalledWith('cid-stores', 'stores');
  });

  it('retorna placeholder quando IPFS falha', async () => {
    env.STORES_REGISTRY_ENABLED = false;
    mockedGetStore.mockResolvedValueOnce({
      storeId: '4',
      owner: '5Eve',
      operators: [],
      reputation: { sales: 0, positive: 0, negative: 0, volumePlanck: '0' },
    });
    mockedResolveCid.mockResolvedValueOnce({ cid: 'cid-falha', source: 'stores' });
    mockedFetchIpfs.mockResolvedValueOnce({ metadata: null, source: 'placeholder' });

    const res = await app.inject({ method: 'GET', url: '/stores/4' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.cid).toBe('cid-falha');
    expect(body.metadata).toBeNull();
    expect(body.source).toBe('placeholder');
  });

  it('não consulta IPFS quando cid não resolvido', async () => {
    env.STORES_REGISTRY_ENABLED = true;
    mockedGetStore.mockResolvedValueOnce({
      storeId: '5',
      owner: '5Frank',
      operators: [],
      reputation: { sales: 0, positive: 0, negative: 0, volumePlanck: '0' },
    });
    mockedResolveCid.mockResolvedValueOnce({ cid: null, source: 'placeholder' });

    const res = await app.inject({ method: 'GET', url: '/stores/5' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.cid).toBeNull();
    expect(body.metadata).toBeNull();
    expect(body.source).toBe('placeholder');
    expect(mockedFetchIpfs).not.toHaveBeenCalled();
  });

  it('returns 404 when store missing', async () => {
    mockedGetStore.mockResolvedValueOnce(null);
    const res = await app.inject({ method: 'GET', url: '/stores/999' });
    expect(res.statusCode).toBe(404);
  });

  it('returns 503 when chain unavailable', async () => {
    mockedGetStore.mockRejectedValueOnce(new Error('ws disconnect'));
    const res = await app.inject({ method: 'GET', url: '/stores/1' });
    expect(res.statusCode).toBe(503);
  });

  it('lists stores owned by address', async () => {
    mockedListOwned.mockResolvedValueOnce(['1', '2']);
    const res = await app.inject({ method: 'GET', url: '/users/5F3sa2TJAWMqDhXG6jhV4N8ko9aCEHu9oqpe6yQ5aEeezyYb/stores-owned' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ storeIds: ['1', '2'] });
  });

  it('validates ss58 address for owned list', async () => {
    const res = await app.inject({ method: 'GET', url: '/users/invalid-address/stores-owned' });
    expect(res.statusCode).toBe(400);
  });

  it('lists stores operated by address', async () => {
    mockedListOperated.mockResolvedValueOnce(['3']);
    const res = await app.inject({ method: 'GET', url: '/users/5F3sa2TJAWMqDhXG6jhV4N8ko9aCEHu9oqpe6yQ5aEeezyYb/stores-operated' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ storeIds: ['3'] });
  });
});
