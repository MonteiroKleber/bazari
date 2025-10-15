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
  timeout?: number; // timeout em ms
}

// Função base para fazer requisições
async function apiFetch<T>(path: string, init: RequestInit = {}, options: ApiOptions = {}): Promise<T> {
  const { requireAuth = true, isRetry = false, timeout = 8000 } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

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
export async function postJSON<T>(
  path: string,
  data: unknown,
  extraHeaders?: Record<string, string>,
  options?: { timeout?: number }
): Promise<T> {
  const baseHeaders: Record<string, string> = {
    "Accept": "application/json",
    "Content-Type": "application/json",
  };
  const headers = extraHeaders ? { ...baseHeaders, ...extraHeaders } : baseHeaders;
  return apiFetch<T>(path, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  }, { timeout: options?.timeout });
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
  // Generic methods
  get: <T = any>(path: string) => getJSON<T>(path),
  getPublic: <T = any>(path: string) => getPublicJSON<T>(path),
  post: <T = any>(path: string, data: any) => postJSON<T>(path, data),
  put: <T = any>(path: string, data: any) => putJSON<T>(path, data),
  patch: <T = any>(path: string, data: any) => patchJSON<T>(path, data),
  delete: <T = any>(path: string) => deleteJSON<T>(path),

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
  getProfile: (handle: string) => getJSON(`/profiles/${encodeURIComponent(handle)}`),
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
  followUser: (handle: string) => postJSON('/social/follow', { targetHandle: handle }),
  unfollowUser: (handle: string) => postJSON('/social/unfollow', { targetHandle: handle }),
  createPost: (payload: any) => postJSON('/posts', payload),
  updatePost: (postId: string, payload: { content: string; media?: Array<{ url: string; type: string }> }) =>
    putJSON(`/posts/${postId}`, payload),
  deletePost: (id: string) => deleteJSON(`/posts/${id}`),

  // Post images
  uploadPostImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return postMultipart<{ asset: { id: string; url: string; mime: string; size: number } }>('/posts/upload-image', formData);
  },

  // Post videos
  uploadPostVideo: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch('/media/upload-video', {
      method: 'POST',
      body: formData,
    }, { requireAuth: true });
  },

  // Global search
  globalSearch: (query: string, type?: string) => {
    const params = new URLSearchParams({ q: query });
    if (type) params.append('type', type);
    return getJSON(`/search/global?${params.toString()}`);
  },

  // Post interactions
  likePost: (postId: string) => postJSON(`/posts/${postId}/like`, {}),
  unlikePost: (postId: string) => deleteJSON(`/posts/${postId}/like`),
  repostPost: (postId: string) => postJSON(`/posts/${postId}/repost`, {}),
  unrepostPost: (postId: string) => deleteJSON(`/posts/${postId}/repost`),
  getPostById: (postId: string) => getJSON(`/posts/${postId}`),

  // Reações
  reactToPost: (postId: string, data: { reaction: string }) =>
    postJSON(`/posts/${postId}/react`, data),
  removeReaction: (postId: string) => deleteJSON(`/posts/${postId}/react`),

  // Bookmarks
  bookmarkPost: (postId: string) => postJSON(`/posts/${postId}/bookmark`, {}),
  unbookmarkPost: (postId: string) => deleteJSON(`/posts/${postId}/bookmark`),
  getMyBookmarks: (params?: { limit?: number; cursor?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return getJSON(`/me/bookmarks${qs}`);
  },

  // Moderação
  reportPost: (postId: string, data: { reason: string; details?: string }) =>
    postJSON(`/posts/${postId}/report`, data),

  // Pin post
  pinPost: (postId: string) => postJSON(`/posts/${postId}/pin`, {}),
  unpinPost: (postId: string) => deleteJSON(`/posts/${postId}/pin`),

  // Polls
  votePoll: (postId: string, data: { optionIndex: number | number[] }) =>
    postJSON(`/posts/${postId}/poll/vote`, data),

  getPostComments: (postId: string, params?: { limit?: number; cursor?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return getJSON(`/posts/${postId}/comments${qs}`);
  },
  getCommentReplies: (postId: string, commentId: string, params?: { limit?: number; cursor?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return getJSON(`/posts/${postId}/comments/${commentId}/replies${qs}`);
  },
  createPostComment: (postId: string, data: { content: string; parentId?: string }) =>
    postJSON(`/posts/${postId}/comments`, data),
  likeComment: (postId: string, commentId: string) =>
    postJSON(`/posts/${postId}/comments/${commentId}/like`, {}),
  unlikeComment: (postId: string, commentId: string) =>
    deleteJSON(`/posts/${postId}/comments/${commentId}/like`),
  updateComment: (postId: string, commentId: string, data: { content: string }) =>
    patchJSON(`/posts/${postId}/comments/${commentId}`, data),
  deleteComment: (postId: string, commentId: string) =>
    deleteJSON(`/posts/${postId}/comments/${commentId}`),

  // Notificações
  getNotifications: (params?: { limit?: number; cursor?: string; unreadOnly?: boolean }) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return getJSON(`/notifications${qs}`);
  },
  markAllNotificationsRead: () => postJSON('/notifications/mark-all-read', {}),

  // Reputação e Badges
  getProfileReputation: (handle: string) => {
    return getJSON(`/profiles/${encodeURIComponent(handle)}/reputation`);
  },
  getProfileBadges: (handle: string) => {
    return getJSON(`/profiles/${encodeURIComponent(handle)}/badges`);
  },
  getReputationHistory: (handle: string) =>
    getJSON(`/profiles/${encodeURIComponent(handle)}/reputation/history`),

  // Chat
  getChatThreads: async (params?: { cursor?: number; limit?: number }): Promise<{ threads: any[] }> =>
    getJSON<{ threads: any[] }>('/api/chat/threads'),
  getChatMessages: async (threadId: string, params?: { cursor?: number; limit?: number }): Promise<{ messages: any[] }> =>
    getJSON<{ messages: any[] }>(`/api/chat/messages?threadId=${threadId}`),
  createChatThread: async (data: { participantId: string; kind?: string }): Promise<any> =>
    postJSON<any>('/api/chat/threads', data),

  // Chat - Upload de mídia
  uploadChatMedia: async (file: File) => {
    await ensureFreshAccessToken();
    const token = getAccessToken();

    if (!token) {
      throw new Error('Not authenticated');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/chat/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Upload failed');
    }

    return response.json();
  },

  // Chat - Grupos
  getChatGroups: async (params?: { cursor?: string; limit?: number; isPublic?: boolean }): Promise<{ groups: any[] }> =>
    getJSON<{ groups: any[] }>('/api/chat/groups'),
  getChatGroup: async (groupId: string): Promise<any> =>
    getJSON<any>(`/api/chat/groups/${groupId}`),
  createChatGroup: async (data: {
    name: string;
    description?: string;
    avatarUrl?: string;
    kind?: 'community' | 'channel' | 'private';
    isPublic?: boolean;
    initialMembers?: string[];
    maxMembers?: number;
  }): Promise<any> => postJSON<any>('/api/chat/groups', data),
  inviteToGroup: (groupId: string, memberId: string) =>
    postJSON(`/api/chat/groups/${groupId}/invite`, { memberId }),
  removeMemberFromGroup: (groupId: string, memberId: string) =>
    deleteJSON(`/api/chat/groups/${groupId}/members/${memberId}`),
  updateGroupRoles: (groupId: string, memberId: string, action: 'promote' | 'demote') =>
    putJSON(`/api/chat/groups/${groupId}/roles`, { memberId, action }),
  updateGroup: (groupId: string, updates: any) =>
    putJSON(`/api/chat/groups/${groupId}`, updates),
  leaveGroup: (groupId: string) =>
    postJSON(`/api/chat/groups/${groupId}/leave`, {}),
  acceptGroupInvite: (notificationId: string) =>
    postJSON(`/api/chat/groups/invites/${notificationId}/accept`, {}),
  rejectGroupInvite: (notificationId: string) =>
    postJSON(`/api/chat/groups/invites/${notificationId}/reject`, {}),

  // Chat - Comércio (Propostas e Vendas)
  createProposal: async (data: {
    threadId: string;
    items: Array<{ sku: string; name: string; qty: number; price: string }>;
    shipping?: { method: string; price: string };
    total: string;
    commissionPercent?: number;
  }): Promise<any> => postJSON<any>('/api/chat/proposals', data),

  getProposal: async (proposalId: string): Promise<any> =>
    getJSON<any>(`/api/chat/proposals/${proposalId}`),

  checkout: async (data: { proposalId: string; storeId?: number; promoterId?: string }): Promise<any> =>
    postJSON<any>('/api/chat/checkout', data),

  getSales: async (params?: { role?: 'buyer' | 'seller' | 'promoter'; cursor?: string; limit?: number }): Promise<any> =>
    getJSON<any>('/api/chat/sales'),

  getSale: async (saleId: string): Promise<any> =>
    getJSON<any>(`/api/chat/sales/${saleId}`),

  getStoreSettings: async (storeId: number): Promise<any> =>
    getJSON<any>(`/api/chat/settings/store/${storeId}`),

  updateStoreSettings: async (storeId: number, data: {
    mode?: 'open' | 'followers' | 'affiliates';
    percent?: number;
    minReputation?: number;
    dailyCommissionCap?: string;
  }): Promise<any> => putJSON<any>(`/chat/settings/store/${storeId}`, data),

  getReputation: async (profileId: string): Promise<any> =>
    getJSON<any>(`/chat/reputation/${profileId}`),

  // Chat - Social Features (Reports, Badges)
  createReport: async (data: {
    reportedId: string;
    contentType: 'message' | 'profile' | 'group';
    contentId: string;
    reason: string;
    description: string;
  }): Promise<any> => postJSON<any>('/chat/reports', data),

  voteReport: async (reportId: string, vote: 'approve' | 'reject'): Promise<any> =>
    postJSON<any>(`/chat/reports/${reportId}/vote`, { vote }),

  getReport: async (reportId: string): Promise<any> =>
    getJSON<any>(`/chat/reports/${reportId}`),

  getBadge: async (profileId: string): Promise<any> =>
    getJSON<any>(`/chat/badges/${profileId}`),

  // Chat - Polls
  createPoll: async (groupId: string, data: {
    question: string;
    options: string[];
    expiresIn?: number;
  }): Promise<any> => postJSON<any>(`/chat/groups/${groupId}/polls`, data),

  votePoll: async (pollId: string, optionId: string): Promise<any> =>
    postJSON<any>(`/chat/polls/${pollId}/vote`, { optionId }),

  getPoll: async (pollId: string): Promise<any> =>
    getJSON<any>(`/chat/polls/${pollId}`),

  // Search profiles (for mentions)
  searchProfiles: async (params: { query: string; limit?: number }): Promise<{ profiles: any[] }> => {
    const queryParams = new URLSearchParams({ q: params.query, limit: String(params.limit || 5) });
    return getJSON<{ profiles: any[] }>(`/search/profiles?${queryParams}`);
  },
};

// Exportar tipos e constantes
export { API_BASE_URL };
export default api;
