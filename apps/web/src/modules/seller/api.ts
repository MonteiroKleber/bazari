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
  createStore: async (payload: { shopName: string; shopSlug: string; about?: string; policies?: Record<string, any> }) => {
    return postJSON<{ sellerProfile: SellerProfileDto & { id: string; isDefault?: boolean } }>(`/me/sellers`, payload);
  },
  getMyStore: async (idOrSlug: string) => {
    return getJSON<{ sellerProfile: SellerProfileDto & { id: string; isDefault?: boolean } }>(`/me/sellers/${encodeURIComponent(idOrSlug)}`);
  },
  updateMyStore: async (idOrSlug: string, payload: Partial<{ shopName: string; shopSlug: string; about: string; policies: Record<string, any> }>) => {
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
};

export default sellerApi;
