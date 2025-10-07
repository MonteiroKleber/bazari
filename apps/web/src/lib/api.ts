import {
  ensureFreshAccessToken,
  getAccessToken,
  refreshSession,
  isReauthInProgress,
} from '../modules/auth/session';

// Cliente HTTP para comunicação com a API
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiOptions {
  requireAuth?: boolean;
  isRetry?: boolean;
}

// Função base para fazer requisições
async function apiFetch<T>(path: string, init: RequestInit = {}, options: ApiOptions = {}): Promise<T> {
  const { requireAuth = true, isRetry = false } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

  try {
    if (requireAuth && !isReauthInProgress()) {
      await ensureFreshAccessToken();
    }

    const headers = new Headers(init.headers ?? {});
    const token = requireAuth ? getAccessToken() : null;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
      credentials: 'include',
    });

    clearTimeout(timeoutId);

    if (response.status === 401 && requireAuth && !isRetry) {
      if (!isReauthInProgress()) {
        const refreshed = await refreshSession();
        if (refreshed) {
          return apiFetch<T>(path, init, { requireAuth, isRetry: true });
        }
      }
      throw new ApiError(401, 'Unauthorized');
    }

    if (!response.ok) {
      const message = await response.text();
      throw new ApiError(response.status, message || `HTTP ${response.status}: ${response.statusText}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return (await response.json()) as T;
    }

    return {} as T;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new ApiError(408, 'Request timeout');
      }
      throw new ApiError(0, error.message);
    }

    throw new ApiError(0, 'Unknown error');
  }
}

// Helper para GET com JSON
export async function getJSON<T>(path: string): Promise<T> {
  return apiFetch<T>(path, {
    method: "GET",
    headers: {
      "Accept": "application/json",
    },
  });
}

// GET sem exigir auth (para endpoints públicos)
export async function getPublicJSON<T>(path: string): Promise<T> {
  return apiFetch<T>(path, {
    method: "GET",
    headers: {
      "Accept": "application/json",
    },
  }, { requireAuth: false });
}

// Helper para POST com JSON
export async function postJSON<T>(path: string, data: unknown, extraHeaders?: Record<string, string>): Promise<T> {
  const baseHeaders: Record<string, string> = {
    "Accept": "application/json",
    "Content-Type": "application/json",
  };
  const headers = extraHeaders ? { ...baseHeaders, ...extraHeaders } : baseHeaders;
  return apiFetch<T>(path, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });
}

// Helper para POST com multipart/form-data
export async function postMultipart<T>(path: string, form: FormData): Promise<T> {
  return apiFetch<T>(path, {
    method: "POST",
    headers: {
      "Accept": "application/json",
    },
    body: form,
  });
}

// Helper para PUT com JSON
export async function putJSON<T>(path: string, data: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: "PUT",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

// Helper para PATCH com JSON
export async function patchJSON<T>(path: string, data: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: "PATCH",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

// Helper para DELETE
export async function deleteJSON<T>(path: string): Promise<T> {
  return apiFetch<T>(path, {
    method: "DELETE",
    headers: {
      "Accept": "application/json",
    },
  });
}

// Classe API para organizar melhor
class ApiClient {
  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return getJSON<T>(`${endpoint}${queryString}`);
  }
  
  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    return postJSON<T>(endpoint, data);
  }
  
  async put<T = any>(endpoint: string, data?: any): Promise<T> {
    return putJSON<T>(endpoint, data);
  }
  
  async delete<T = any>(endpoint: string): Promise<T> {
    return deleteJSON<T>(endpoint);
  }
  
  async upload<T = any>(endpoint: string, file: File, additionalData?: Record<string, any>): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }
    
    return postMultipart<T>(endpoint, formData);
  }
}

// Instância exportada
export const api = new ApiClient();

// Helpers específicos do domínio
export const apiHelpers = {
  // Health check
  health: () => getJSON('/health'),
  
  // Categories
  getCategories: () => getJSON('/categories'),
  getCategorySpec: (path: string) => getJSON(`/categories/effective-spec?path=${path}`),
  getCategoryById: (id: string) => getJSON(`/categories/${id}/spec`),
  
  // Products
  createProduct: (data: any) => postJSON('/products', data),
  // Produto é público; não exigir auth
  getProduct: (id: string) => getPublicJSON(`/products/${id}`),
  updateProduct: (id: string, data: any) => putJSON(`/products/${id}`, data),
  deleteProduct: (id: string) => deleteJSON(`/products/${id}`),
  listProducts: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return getJSON(`/products${queryString}`);
  },
  
  // Services
  createService: (data: any) => postJSON('/services', data),
  getService: (id: string) => getJSON(`/services/${id}`),
  updateService: (id: string, data: any) => putJSON(`/services/${id}`, data),
  deleteService: (id: string) => deleteJSON(`/services/${id}`),
  listServices: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return getJSON(`/services${queryString}`);
  },
  
  // Media/Upload
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return postMultipart('/media/upload', formData);
  },
  
  // Search
  search: (query: string, filters?: any) => {
    const params = { q: query, ...filters };
    const queryString = '?' + new URLSearchParams(params).toString();
    return getJSON(`/search${queryString}`);
  },

  // Payments & Orders
  getPaymentsConfig: () => getJSON('/payments/config'),
  createPaymentIntent: (orderId: string) => postJSON(`/orders/${orderId}/payment-intent`, {}),
  getOrder: (orderId: string) => getJSON(`/orders/${orderId}`),
  confirmReceived: (orderId: string) => postJSON(`/orders/${orderId}/confirm-received`, {}),
  cancelOrder: (orderId: string) => postJSON(`/orders/${orderId}/cancel`, {}),

  // Profiles (public)
  getPublicProfile: (handle: string) => getJSON(`/profiles/${encodeURIComponent(handle)}`),
  getProfilePosts: (handle: string, params?: any) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return getJSON(`/profiles/${encodeURIComponent(handle)}/posts${qs}`);
  },
  getFollowers: (handle: string, params?: any) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return getJSON(`/profiles/${encodeURIComponent(handle)}/followers${qs}`);
  },
  getFollowing: (handle: string, params?: any) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return getJSON(`/profiles/${encodeURIComponent(handle)}/following${qs}`);
  },
  resolveProfile: (params: { address?: string; handle?: string }) => {
    const qs = '?' + new URLSearchParams(params as any).toString();
    return getJSON(`/profiles/_resolve${qs}`);
  },

  // Profiles (private)
  getMeProfile: () => getJSON('/me/profile'),
  upsertMeProfile: (payload: any) => postJSON('/me/profile', payload),
  upsertMeSeller: (payload: any) => postJSON('/me/seller', payload),
  getMeSeller: () => getJSON('/me/seller'),
  getSellerPublic: (shopSlug: string, params?: any) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return getJSON(`/sellers/${encodeURIComponent(shopSlug)}${qs}`);
  },
  follow: (targetHandle: string) => postJSON('/social/follow', { targetHandle }),
  unfollow: (targetHandle: string) => postJSON('/social/unfollow', { targetHandle }),
  createPost: (payload: any) => postJSON('/posts', payload),
  deletePost: (id: string) => deleteJSON(`/posts/${id}`),

  // Reputação e Badges
  getProfileReputation: (handle: string) => {
    return getJSON(`/profiles/${encodeURIComponent(handle)}/reputation`);
  },
  getProfileBadges: (handle: string) => {
    return getJSON(`/profiles/${encodeURIComponent(handle)}/badges`);
  },
};

// Exportar tipos e constantes
export { API_BASE_URL };
export default api;
