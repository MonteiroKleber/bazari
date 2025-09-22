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
};
