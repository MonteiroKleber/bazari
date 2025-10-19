import { getJSON, postJSON, patchJSON, putJSON } from '../api';
import type {
  DeliveryRequest,
  DeliveryProfile,
  StoreDeliveryPartner,
  DeliveryFeeResult,
  DeliveryProfileStats,
  CalculateFeePayload,
  CreateDeliveryRequestPayload,
  CreateDeliveryProfilePayload,
  UpdateDeliveryProfilePayload,
  UpdateAvailabilityPayload,
  CancelDeliveryPayload,
  UpdatePartnerPayload,
  ListDeliveryRequestsQuery,
  DeliveryRequestStatus,
} from '@/types/delivery';

// ===========================
// DELIVERY REQUESTS
// ===========================

/**
 * Calculate delivery fee
 */
export async function calculateFee(
  payload: CalculateFeePayload
): Promise<DeliveryFeeResult> {
  return postJSON<DeliveryFeeResult>('/api/delivery/requests/calculate-fee', payload);
}

/**
 * Create a new delivery request
 */
export async function createRequest(
  payload: CreateDeliveryRequestPayload
): Promise<DeliveryRequest> {
  return postJSON<DeliveryRequest>('/api/delivery/requests', payload);
}

/**
 * List delivery requests with optional filters
 */
export async function listRequests(
  query?: ListDeliveryRequestsQuery
): Promise<DeliveryRequest[]> {
  const params = new URLSearchParams();

  if (query?.status) {
    query.status.forEach((status) => params.append('status', status));
  }
  if (query?.delivererId) {
    params.append('delivererId', query.delivererId);
  }
  if (query?.requesterId) {
    params.append('requesterId', query.requesterId);
  }
  if (query?.storeId) {
    params.append('storeId', query.storeId);
  }
  if (query?.lat !== undefined) {
    params.append('lat', query.lat.toString());
  }
  if (query?.lng !== undefined) {
    params.append('lng', query.lng.toString());
  }
  if (query?.radius !== undefined) {
    params.append('radius', query.radius.toString());
  }

  const queryString = params.toString();
  const response = await getJSON<{ data: DeliveryRequest[]; pagination: any }>(
    `/api/delivery/requests${queryString ? `?${queryString}` : ''}`
  );

  // Backend returns { data: [], pagination: {} }, extract data array
  return response.data || [];
}

/**
 * Get a specific delivery request by ID
 */
export async function getRequest(id: string): Promise<DeliveryRequest> {
  return getJSON<DeliveryRequest>(`/api/delivery/requests/${id}`);
}

/**
 * Accept a delivery request (deliverer)
 */
export async function acceptRequest(id: string): Promise<DeliveryRequest> {
  return postJSON<DeliveryRequest>(`/api/delivery/requests/${id}/accept`, {});
}

/**
 * Confirm package pickup (deliverer)
 */
export async function confirmPickup(id: string): Promise<DeliveryRequest> {
  return postJSON<DeliveryRequest>(`/api/delivery/requests/${id}/pickup`, {
    pickedUpAt: new Date().toISOString(),
  });
}

/**
 * Confirm delivery completion (deliverer)
 */
export async function confirmDelivery(id: string): Promise<DeliveryRequest> {
  return postJSON<DeliveryRequest>(`/api/delivery/requests/${id}/deliver`, {
    deliveredAt: new Date().toISOString(),
  });
}

/**
 * Cancel a delivery request
 */
export async function cancelRequest(
  id: string,
  cancelReason: string
): Promise<DeliveryRequest> {
  return postJSON<DeliveryRequest>(`/api/delivery/requests/${id}/cancel`, {
    cancelReason,
  });
}

// ===========================
// DELIVERY PROFILE
// ===========================

/**
 * Get current user's delivery profile
 */
export async function getProfile(): Promise<DeliveryProfile> {
  return getJSON<DeliveryProfile>('/api/delivery/profile');
}

/**
 * Create a new delivery profile for current user
 */
export async function createProfile(
  payload: CreateDeliveryProfilePayload
): Promise<DeliveryProfile> {
  return postJSON<DeliveryProfile>('/api/delivery/profile', payload);
}

/**
 * Update current user's delivery profile
 */
export async function updateProfile(
  payload: UpdateDeliveryProfilePayload
): Promise<DeliveryProfile> {
  return putJSON<DeliveryProfile>('/api/delivery/profile', payload);
}

/**
 * Update availability status (online/offline)
 */
export async function updateAvailability(
  isAvailable: boolean
): Promise<DeliveryProfile> {
  return patchJSON<DeliveryProfile>('/api/delivery/profile/availability', {
    isAvailable,
  });
}

/**
 * Get delivery statistics for current user
 */
export async function getStats(): Promise<DeliveryProfileStats> {
  return getJSON<DeliveryProfileStats>('/api/delivery/profile/stats');
}

/**
 * Update deliverer's current location (GPS coordinates)
 */
export async function updateLocation(payload: {
  lat: number;
  lng: number;
  accuracy?: number;
}): Promise<{ success: boolean; location: any }> {
  return putJSON('/api/delivery/profile/location', payload);
}

// ===========================
// STORE PARTNERS
// ===========================

/**
 * List store's linked delivery partners
 */
export async function listStorePartners(): Promise<StoreDeliveryPartner[]> {
  return getJSON<StoreDeliveryPartner[]>('/api/delivery/partners');
}

/**
 * Request partnership with a deliverer (store owner)
 */
export async function requestPartnership(
  deliveryProfileId: string
): Promise<StoreDeliveryPartner> {
  return postJSON<StoreDeliveryPartner>('/api/delivery/partners', {
    deliveryProfileId,
  });
}

/**
 * Update a store partner (priority, active status)
 */
export async function updatePartner(
  partnerId: string,
  payload: UpdatePartnerPayload
): Promise<StoreDeliveryPartner> {
  return putJSON<StoreDeliveryPartner>(
    `/api/delivery/partners/${partnerId}`,
    payload
  );
}

/**
 * Remove a store partner
 */
export async function removePartner(partnerId: string): Promise<void> {
  return putJSON<void>(`/api/delivery/partners/${partnerId}`, { isActive: false });
}

/**
 * Request partnership with a store (deliverer-side)
 */
export async function requestStorePartnership(
  storeId: string,
  message?: string
): Promise<{ id: string; storeId: string; status: string }> {
  return postJSON(`/api/stores/${storeId}/delivery-partners/request`, { message });
}

// ===========================
// EXPORT DEFAULT API OBJECT
// ===========================

export const deliveryApi = {
  // Delivery Requests
  calculateFee,
  createRequest,
  listRequests,
  getRequest,
  acceptRequest,
  confirmPickup,
  confirmDelivery,
  cancelRequest,

  // Delivery Profile
  getProfile,
  createProfile,
  updateProfile,
  updateAvailability,
  updateLocation,
  getStats,

  // Store Partners
  listStorePartners,
  requestPartnership,
  updatePartner,
  removePartner,
  requestStorePartnership,
};
