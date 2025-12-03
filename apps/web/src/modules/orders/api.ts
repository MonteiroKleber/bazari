// path: apps/web/src/modules/orders/api.ts

import { apiHelpers, postJSON, getJSON } from '@/lib/api';

export interface CreateOrderRequest {
  items: Array<{
    listingId: string;
    qty: number;
    kind: 'product' | 'service';
  }>;
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  shippingOptionId?: string;
  notes?: string;
}

export interface CreateOrderResponse {
  orderId: string;
  status: string;
  totals: {
    subtotalBzr: string;
    shippingBzr: string;
    totalBzr: string;
  };
  items: Array<{
    listingId: string;
    qty: number;
    kind: string;
    unitPriceBzrSnapshot: string;
    titleSnapshot: string;
    lineTotalBzr: string;
  }>;
}

export interface PrepareEscrowLockResponse {
  orderId: string;
  seller: string;
  buyer: string;
  amount: string;
  callHex: string;
  callHash: string;
  method: string;
}

export interface ConfirmEscrowLockResponse {
  success: boolean;
  orderId: string;
  txHash: string;
  status: string;
  escrow: {
    buyer: string;
    seller: string;
    amountLocked: string;
    lockedAt: number;
  };
}

export interface ConfirmReleaseResponse {
  success: boolean;
  order: {
    id: string;
    status: string;
  };
  txHash: string;
  blockNumber: string | null;
  message: string;
}

// PROPOSAL-000: Mark as Shipped
export interface MarkAsShippedRequest {
  trackingCode?: string;
}

export interface MarkAsShippedResponse {
  success: boolean;
  order: {
    id: string;
    status: string;
    shippedAt: string;
    trackingCode?: string;
  };
  message: string;
}

// PROPOSAL-003: Multi-Store Checkout Types
export interface StoreOrderData {
  sellerId: string;
  items: Array<{
    listingId: string;
    qty: number;
    kind: 'product' | 'service';
    shippingOptionId?: string;
    shippingOptionSnapshot?: {
      method: string;
      label?: string;
      pricingType: string;
      priceBzr?: string;
      estimatedDeliveryDays?: number;
    };
  }>;
  shippingOptionId?: string;
}

export interface CreateMultiOrderRequest {
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  stores: StoreOrderData[];
  notes?: string;
}

export interface CreateMultiOrderResponse {
  checkoutSessionId: string;
  orders: Array<{
    orderId: string;
    sellerId: string;
    sellerName: string;
    status: string;
    totals: {
      subtotalBzr: string;
      shippingBzr: string;
      totalBzr: string;
    };
    items: Array<{
      listingId: string;
      qty: number;
      kind: string;
      unitPriceBzrSnapshot: string;
      titleSnapshot: string;
      lineTotalBzr: string;
    }>;
  }>;
  totals: {
    subtotalBzr: string;
    shippingBzr: string;
    totalBzr: string;
  };
  expiresAt: string;
}

export const ordersApi = {
  create: async (data: CreateOrderRequest): Promise<CreateOrderResponse> => {
    // Generate a simple Idempotency-Key
    const idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    // Timeout de 60s para permitir finalização da transação blockchain
    return postJSON<CreateOrderResponse>(`/orders`, data, {
      'Idempotency-Key': idempotencyKey,
    }, { timeout: 60000 });
  },

  // PROPOSAL-003: Multi-Store Checkout
  createMulti: async (data: CreateMultiOrderRequest): Promise<CreateMultiOrderResponse> => {
    const idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return postJSON<CreateMultiOrderResponse>(`/orders/multi`, data, {
      'Idempotency-Key': idempotencyKey,
    }, { timeout: 120000 }); // 2min timeout for multi-order creation
  },

  // Reutilizar os helpers existentes para outras operações
  get: (orderId: string) => apiHelpers.getOrder(orderId),
  createPaymentIntent: (orderId: string) => apiHelpers.createPaymentIntent(orderId),
  confirmReceived: (orderId: string) => apiHelpers.confirmReceived(orderId),
  cancel: (orderId: string) => apiHelpers.cancelOrder(orderId),

  // Escrow operations (Phase 1 - Escrow Real)
  // Timeout de 60s para operações blockchain
  prepareEscrowLock: (orderId: string) =>
    postJSON<PrepareEscrowLockResponse>(`/api/blockchain/escrow/${orderId}/prepare-lock`, {}, undefined, { timeout: 60000 }),
  confirmEscrowLock: (orderId: string, txHash: string, blockNumber?: string) =>
    postJSON<ConfirmEscrowLockResponse>(`/api/blockchain/escrow/${orderId}/confirm-lock`, {
      txHash,
      blockNumber,
    }, undefined, { timeout: 60000 }),
  getEscrowStatus: (orderId: string) =>
    getJSON<any>(`/api/blockchain/escrow/${orderId}`),

  // Confirm release (after user signs release tx on frontend)
  confirmRelease: (orderId: string, txHash: string, blockNumber?: string) =>
    postJSON<ConfirmReleaseResponse>(`/orders/${orderId}/confirm-release`, {
      txHash,
      blockNumber,
    }, undefined, { timeout: 60000 }),

  // PROPOSAL-000: Mark order as shipped (seller only)
  markAsShipped: (orderId: string, data?: MarkAsShippedRequest) =>
    postJSON<MarkAsShippedResponse>(`/orders/${orderId}/ship`, data || {}),
};
