import { getJSON, postJSON, patchJSON } from '@/lib/api';

export interface SellerProfileDto {
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
  getMe: async () => {
    return getJSON<{ sellerProfile: SellerProfileDto | null }>(`/me/seller`);
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
  // Products of the current seller
  listMyProducts: async (params?: { status?: 'DRAFT'|'PUBLISHED'|'ARCHIVED'; cursor?: string; limit?: number }) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return getJSON<{ items: Array<{ id: string; title: string; priceBzr: string; status: string; categoryPath: string[]; updatedAt: string }>; nextCursor?: string }>(`/me/products${qs}`);
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
  listMyOrders: async (params?: { status?: string; cursor?: string; limit?: number }) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return getJSON<{ items: Array<{ id: string; createdAt: string; totalBzr: string; status: string; items: Array<{ listingId: string; titleSnapshot: string; qty: number; lineTotalBzr: string }> }>; nextCursor?: string }>(`/me/seller/orders${qs}`);
  },
};

export default sellerApi;
