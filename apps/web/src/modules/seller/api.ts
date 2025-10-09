import { getJSON, postJSON, patchJSON } from '@/lib/api';

export interface SellerProfileDto {
  id?: string;
  shopName: string;
  shopSlug: string;
  about?: string | null;
  policies?: Record<string, any> | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  ratingAvg: number;
  ratingCount: number;
  onChainStoreId?: string | number | null;
  ownerAddress?: string | null;
  operatorAddresses?: string[] | null;
  syncStatus?: string | null;
  version?: number | null;
  lastSyncBlock?: string | number | null;
  lastPublishedAt?: string | null;
  metadataCid?: string | null;
  categoriesCid?: string | null;
  categoriesHash?: string | null;
  productsCid?: string | null;
  productsHash?: string | null;
  onChainReputation?: {
    sales?: number | null;
    positive?: number | null;
    negative?: number | null;
    volumePlanck?: string | number | null;
  } | null;
}

export const sellerApi = {
  // Legacy: retorna loja única (se existir)
  getMe: async () => {
    return getJSON<{ sellerProfile: SellerProfileDto | null }>(`/me/seller`);
  },
  // Multi-lojas
  listMyStores: async () => {
    return getJSON<{ items: Array<{ id: string; shopName: string; shopSlug: string; isDefault?: boolean }> }>(`/me/sellers`);
  },
  createStore: async (payload: { shopName: string; shopSlug: string; about?: string; policies?: Record<string, any>; onChainStoreId?: string | number | null; ownerAddress?: string | null; operatorAddresses?: string[] | null }) => {
    return postJSON<{ sellerProfile: SellerProfileDto & { id: string; isDefault?: boolean } }>(`/me/sellers`, payload);
  },
  getMyStore: async (idOrSlug: string) => {
    return getJSON<{ sellerProfile: SellerProfileDto & { id: string; isDefault?: boolean } }>(`/me/sellers/${encodeURIComponent(idOrSlug)}`);
  },
  updateMyStore: async (
    idOrSlug: string,
    payload: Partial<{
      shopName: string;
      shopSlug: string;
      about: string;
      policies: Record<string, any>;
      onChainStoreId: string | number | null;
      ownerAddress: string | null;
      operatorAddresses: string[] | null;
    }>
  ) => {
    return patchJSON<{ sellerProfile: SellerProfileDto & { id: string; isDefault?: boolean } }>(`/me/sellers/${encodeURIComponent(idOrSlug)}`, payload as any);
  },
  setDefaultStore: async (idOrSlug: string) => {
    return postJSON<{ ok: true }>(`/me/sellers/${encodeURIComponent(idOrSlug)}/set-default`, {});
  },
  upsertMe: async (payload: {
    shopName: string;
    shopSlug: string;
    about?: string;
    policies?: Record<string, any>;
  }) => {
    return postJSON<{ sellerProfile: SellerProfileDto }>(`/me/seller`, payload);
  },
  getPublic: async (shopSlug: string, params?: { cursor?: string; limit?: number }) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return getJSON<{ sellerProfile: SellerProfileDto; owner: { handle?: string; displayName?: string; avatarUrl?: string } | null; catalog: { products: Array<{ id: string; title: string; priceBzr: string; coverUrl?: string }>; page?: { nextCursor?: string; limit: number } } }>(`/sellers/${encodeURIComponent(shopSlug)}${qs}`);
  },
  // Products of a specific store (by slug or id)
  listStoreProducts: async (idOrSlug: string, params?: { status?: 'DRAFT'|'PUBLISHED'|'ARCHIVED'; cursor?: string; limit?: number }) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return getJSON<{ items: Array<{ id: string; title: string; priceBzr: string; status: string; categoryPath: string[]; updatedAt: string }>; nextCursor?: string }>(`/me/sellers/${encodeURIComponent(idOrSlug)}/products${qs}`);
  },
  updateMyProduct: async (id: string, data: Partial<{ title: string; description: string; priceBzr: string; categoryPath: string[]; attributes: any; mediaIds: string[] }>) => {
    return patchJSON(`/me/products/${id}`, data as any);
  },
  publishMyProduct: async (id: string) => {
    return postJSON<{ id: string; status: string }>(`/me/products/${id}/publish`, {});
  },
  archiveMyProduct: async (id: string) => {
    return postJSON<{ id: string; status: string }>(`/me/products/${id}/archive`, {});
  },
  listStoreOrders: async (idOrSlug: string, params?: { status?: string; cursor?: string; limit?: number }) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return getJSON<{ items: Array<{ id: string; createdAt: string; totalBzr: string; status: string; items: Array<{ listingId: string; titleSnapshot: string; qty: number; lineTotalBzr: string }> }>; nextCursor?: string }>(`/me/sellers/${encodeURIComponent(idOrSlug)}/orders${qs}`);
  },
  syncCatalog: async (idOrSlug: string) => {
    return postJSON<{ catalog: { version: string; storeId: string; itemCount: number; items: any[] }; message: string }>(`/me/sellers/${encodeURIComponent(idOrSlug)}/sync-catalog`, {});
  },
  listPendingTransfers: async () => {
    return getJSON<{
      pendingTransfers: Array<{
        storeId: string;
        shopSlug: string;
        shopName: string;
        dbId: string;
        currentOwnerAddress: string;
        state: 'pending' | 'claimable';
        targetOwnerAddress: string;
      }>;
    }>(`/me/sellers/pending-transfers`);
  },
  publishStore: async (
    storeId: string,
    payload: { signerMnemonic: string }
  ) => {
    return postJSON<{ status: string; version: number; blockNumber: string; cids: { store: string; categories: string; products: string } }>(
      `/stores/${encodeURIComponent(storeId)}/publish`,
      payload,
      undefined, // extraHeaders
      { timeout: 90000 } // 90 segundos para transações blockchain
    );
  },
  getPublishStatus: async (storeId: string) => {
    return getJSON<{ status: string; version: number; block?: string; publishedAt?: string }>(
      `/stores/${encodeURIComponent(storeId)}/publish/status`
    );
  },
  verifyStore: async (storeId: string) => {
    return postJSON<{ status: string; message: string }>(
      `/stores/${encodeURIComponent(storeId)}/verify`,
      {}
    );
  },
};

export default sellerApi;
