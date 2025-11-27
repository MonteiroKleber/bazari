// path: apps/web/src/modules/orders/api.ts

import { apiHelpers, postJSON } from '@/lib/api';

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

export const ordersApi = {
  create: async (data: CreateOrderRequest): Promise<CreateOrderResponse> => {
    // Generate a simple Idempotency-Key
    const idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return postJSON<CreateOrderResponse>(`/orders`, data, {
      'Idempotency-Key': idempotencyKey,
    });
  },

  // Reutilizar os helpers existentes para outras operações
  get: (orderId: string) => apiHelpers.getOrder(orderId),
  createPaymentIntent: (orderId: string) => apiHelpers.createPaymentIntent(orderId),
  confirmReceived: (orderId: string) => apiHelpers.confirmReceived(orderId),
  cancel: (orderId: string) => apiHelpers.cancelOrder(orderId),

  // Escrow operations (Phase 1 - Escrow Real)
  prepareEscrowLock: (orderId: string) =>
    postJSON<PrepareEscrowLockResponse>(`/blockchain/escrow/${orderId}/prepare-lock`, {}),
  confirmEscrowLock: (orderId: string, txHash: string, blockNumber?: string) =>
    postJSON<ConfirmEscrowLockResponse>(`/blockchain/escrow/${orderId}/confirm-lock`, {
      txHash,
      blockNumber,
    }),
};
