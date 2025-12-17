import { getJSON, postJSON, getPublicJSON } from '@/lib/api';

export interface P2POffer {
  id: string;
  ownerId: string;
  side: 'BUY_BZR' | 'SELL_BZR';
  priceBRLPerBZR: string;
  minBRL: string;
  maxBRL: string;
  method: 'PIX';
  autoReply?: string | null;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
  owner?: { userId?: string; handle?: string; displayName?: string; avatarUrl?: string | null } | null;
  ownerStats?: { avgStars: number | null; completionRate: number | null; volume30dBRL: number; volume30dBZR: number };
  // NOVOS CAMPOS ZARI:
  assetType?: 'BZR' | 'ZARI';
  assetId?: string | null;
  phase?: string | null;
  phasePrice?: string | null;
  priceBRLPerUnit?: string | null;
}

export interface P2PPaymentProfile {
  userId: string;
  pixKey: string | null;
  bankName?: string | null;
  accountName?: string | null;
}

export interface Order {
  id: string;
  offerId: string;
  makerId: string;
  takerId: string;
  side: 'BUY_BZR' | 'SELL_BZR';
  amountBZR: string;
  amountBRL: string;
  priceBRLPerBZR?: string;
  status: 'DRAFT' | 'AWAITING_ESCROW' | 'AWAITING_FIAT_PAYMENT' | 'AWAITING_CONFIRMATION' | 'RELEASED' | 'CANCELLED' | 'EXPIRED';
  pixKeySnapshot?: string | null;
  proofUrls?: string[] | null;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  assetType?: 'BZR' | 'ZARI';
  maker?: { userId?: string; handle?: string; displayName?: string; avatarUrl?: string | null } | null;
  taker?: { userId?: string; handle?: string; displayName?: string; avatarUrl?: string | null } | null;
}

export const p2pApi = {
  listOffers: (params?: { side?: 'BUY_BZR' | 'SELL_BZR'; method?: 'PIX'; minBRL?: number; maxBRL?: number; cursor?: string; limit?: number }) => {
    let qs = '';
    if (params) {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        const s = String(v);
        if (s === '' || s === 'undefined' || s === 'null' || s === 'NaN') return;
        query.append(k, s);
      });
      const built = query.toString();
      qs = built ? `?${built}` : '';
    }
    return getPublicJSON<{ items: P2POffer[]; nextCursor: string | null }>(`/p2p/offers${qs}`);
  },
  getOffer: (id: string) => getJSON<P2POffer>(`/p2p/offers/${encodeURIComponent(id)}`),
  createOffer: (payload: { side: 'BUY_BZR' | 'SELL_BZR'; priceBRLPerBZR: number; minBRL: number; maxBRL: number; method: 'PIX'; autoReply?: string }) => {
    return postJSON<P2POffer>('/p2p/offers', payload);
  },
  getPaymentProfile: () => getJSON<P2PPaymentProfile>('/p2p/payment-profile'),
  upsertPaymentProfile: (payload: { pixKey: string; bankName?: string; accountName?: string }) => postJSON<P2PPaymentProfile>('/p2p/payment-profile', payload),
  createOrder: (offerId: string, payload: { amountBRL?: number; amountBZR?: number }) => postJSON(`/p2p/offers/${encodeURIComponent(offerId)}/orders`, payload),
  getOrder: (orderId: string) => getJSON(`/p2p/orders/${encodeURIComponent(orderId)}`),
  escrowIntent: (orderId: string) => postJSON(`/p2p/orders/${encodeURIComponent(orderId)}/escrow-intent`, {}),
  escrowConfirm: (orderId: string, payload: { txHash: string }) => postJSON(`/p2p/orders/${encodeURIComponent(orderId)}/escrow-confirm`, payload),
  markPaid: (orderId: string, payload: { proofUrls?: string[]; note?: string }) => postJSON(`/p2p/orders/${encodeURIComponent(orderId)}/mark-paid`, payload),
  confirmReceived: (orderId: string) => postJSON(`/p2p/orders/${encodeURIComponent(orderId)}/confirm-received`, {}),
  cancelOrder: (orderId: string) => postJSON(`/p2p/orders/${encodeURIComponent(orderId)}/cancel`, {}),
  listMyOrders: (params?: { status?: 'ACTIVE'|'HIST'; cursor?: string; limit?: number }) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return getJSON<{ items: Array<any>; nextCursor: string | null }>(`/p2p/my-orders${qs}`);
  },
  createReview: (orderId: string, payload: { stars: number; comment?: string }) => postJSON(`/p2p/orders/${encodeURIComponent(orderId)}/review`, payload),
  listMessages: (orderId: string, params?: { cursor?: string; limit?: number }) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return getJSON<{ items: Array<{ id: string; body: string; kind: string; createdAt: string; sender: any }>; nextCursor: string | null }>(`/p2p/orders/${encodeURIComponent(orderId)}/messages${qs}`);
  },
  sendMessage: (orderId: string, payload: { body: string }) => postJSON(`/p2p/orders/${encodeURIComponent(orderId)}/messages`, payload),
  listMyOffers: (params?: { status?: 'ACTIVE'|'PAUSED'|'ARCHIVED'; cursor?: string; limit?: number }) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return getJSON<{ items: P2POffer[]; nextCursor: string | null }>(`/p2p/my-offers${qs}`);
  },

  // NOVOS MÉTODOS ZARI:
  getZARIPhase: (): Promise<{
    phase: string;
    priceBZR: string;
    supplyLimit: string;
    supplySold: string;
    supplyRemaining: string;
    progressPercent: number;
    isActive: boolean;
    nextPhase: string | null;
  }> => getPublicJSON('/p2p/zari/phase'),

  getZARIStats: (): Promise<{
    phases: Array<{
      phase: string;
      priceBZR: string;
      supplyLimit: string;
      active: boolean;
      startBlock: string | null;
      endBlock: string | null;
    }>;
    activePhase: string | null;
    totalSold: string;
    totalP2PSupply: string;
    overallProgress: number;
    completedOrders: number;
  }> => getPublicJSON('/p2p/zari/stats'),

  escrowLock: (orderId: string, payload: { makerAddress: string }): Promise<{
    success: boolean;
    txHash: string;
    blockNumber: string;
    amount: string;
    assetType: 'BZR' | 'ZARI';
    message: string;
  }> => postJSON(`/p2p/orders/${encodeURIComponent(orderId)}/escrow-lock`, payload),

  escrowRelease: (orderId: string, payload: { takerAddress: string }): Promise<{
    success: boolean;
    txHash: string;
    blockNumber: string;
    amount: string;
    assetType: 'BZR' | 'ZARI';
    recipient: string;
    message: string;
  }> => postJSON(`/p2p/orders/${encodeURIComponent(orderId)}/escrow-release`, payload),
};
