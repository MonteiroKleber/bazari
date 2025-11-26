import { API_BASE_URL } from '../../config';
import { SessionPayload, setSession, clearSession, getAccessToken } from './session';
import { getAccessToken as getGoogleAccessToken } from './social/google-login';

export interface NonceResponse {
  nonce: string;
  domain: string;
  uri: string;
  genesisHash: string;
  issuedAt: string;
  expiresAt: string;
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  // Tenta primeiro token da sessão SIWS; se ausente, cai para token social armazenado em localStorage
  const token = getAccessToken() ?? getGoogleAccessToken();

  const headers = new Headers(init?.headers ?? undefined);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  const hasBody = init?.body != null && !(init.body instanceof FormData);
  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(input, {
    ...init,
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return response.json() as Promise<T>;
  }
  return {} as T;
}

export async function fetchNonce(address: string): Promise<NonceResponse> {
  const params = new URLSearchParams({ address });
  return requestJson<NonceResponse>(`${API_BASE_URL}/auth/nonce?${params.toString()}`);
}

export interface LoginPayload {
  address: string;
  message: string;
  signature: string;
}

export async function loginSiws(payload: LoginPayload) {
  const data = await requestJson<SessionPayload>(`${API_BASE_URL}/auth/login-siws`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  setSession(data);
  return data;
}

export async function refreshSessionApi() {
  const data = await requestJson<SessionPayload>(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
  });
  setSession(data);
  return data;
}

export async function logoutSession() {
  await requestJson(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
  });
  clearSession();
}

export async function deviceLink(payload: { address: string; challenge: string; signature: string }) {
  return requestJson(`${API_BASE_URL}/auth/device-link`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchProfile() {
  return requestJson<{ address: string }>(`${API_BASE_URL}/me`, {
    method: 'GET',
  });
}

export interface SetupPinPayload {
  pinHash: string;
  googleId: string;
}

export interface SetupPinResponse {
  success: boolean;
  wallet: {
    encryptedMnemonic: string;
    iv: string;
    salt: string;
    authTag: string;
    address: string;
    iterations?: number;
    format?: 'base64' | 'hex';
  };
}

export async function setupPinForOAuth(payload: SetupPinPayload): Promise<SetupPinResponse> {
  const token = getGoogleAccessToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return requestJson<SetupPinResponse>(`${API_BASE_URL}/auth/social/setup-pin`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
}

export interface SocialWalletResponse {
  success: boolean;
  wallet: {
    encryptedMnemonic: string;
    iv: string;
    salt: string;
    authTag: string;
    address: string;
  };
  user: {
    id: string;
    address: string;
    googleId: string;
  };
}

export async function fetchSocialWallet(force = false, tokenOverride?: string): Promise<SocialWalletResponse> {
  const token = tokenOverride ?? getGoogleAccessToken();
  const headers: HeadersInit = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return requestJson<SocialWalletResponse>(`${API_BASE_URL}/auth/social/wallet${force ? '?force=true' : ''}`, {
    method: 'GET',
    headers,
  });
}

export interface SocialBackupPayload {
  encryptedMnemonic: string;
  iv: string;
  salt: string;
  authTag?: string | null;
  iterations: number;
  address: string;
}

export async function saveSocialBackup(payload: SocialBackupPayload, tokenOverride?: string) {
  const token = tokenOverride ?? getGoogleAccessToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return requestJson(`${API_BASE_URL}/auth/social/backup`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
}

export async function getSocialBackup(tokenOverride?: string): Promise<{ success: boolean; wallet: SocialBackupPayload }> {
  const token = tokenOverride ?? getGoogleAccessToken();
  const headers: HeadersInit = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return requestJson<{ success: boolean; wallet: SocialBackupPayload }>(`${API_BASE_URL}/auth/social/wallet`, {
    method: 'GET',
    headers,
  });
}

// ===========================
// OAuth Multi-Conta API
// ===========================

export interface CreateSocialBackupPayload {
  accountName: string;
  encryptedMnemonic: string;
  iv: string;
  salt: string;
  authTag: string;
  iterations?: number;
  address: string;
  deviceFingerprint?: string;
}

export interface SocialBackupMetadata {
  id: string;
  accountName: string;
  accountIndex: number;
  address: string;
  createdAt: string;
  lastUsedAt: string;
  deviceFingerprint?: string;
}

export interface SocialBackupFull {
  wallet: {
    encryptedMnemonic: string;
    iv: string;
    salt: string;
    authTag: string;
    iterations: number;
    address: string;
  };
  metadata: {
    id: string;
    accountName: string;
    accountIndex: number;
    createdAt: string;
    lastUsedAt: string;
  };
}

/**
 * Criar novo backup E2EE para conta OAuth
 */
export async function createSocialBackup(payload: CreateSocialBackupPayload) {
  const token = getGoogleAccessToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return requestJson<{ success: boolean; backup: SocialBackupMetadata }>(`${API_BASE_URL}/auth/social-backup/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
}

/**
 * Listar todas contas OAuth do usuário
 */
export async function listSocialBackups() {
  const token = getGoogleAccessToken();
  const headers: HeadersInit = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return requestJson<{ backups: SocialBackupMetadata[]; total: number }>(`${API_BASE_URL}/auth/social-backup/list`, {
    method: 'GET',
    headers,
  });
}

/**
 * Buscar backup específico para restore
 */
export async function getSocialBackupById(id: string) {
  const token = getGoogleAccessToken();
  const headers: HeadersInit = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return requestJson<SocialBackupFull>(`${API_BASE_URL}/auth/social-backup/${id}`, {
    method: 'GET',
    headers,
  });
}

/**
 * Atualizar lastUsedAt após restore
 */
export async function updateSocialBackupUsage(id: string) {
  const token = getGoogleAccessToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return requestJson<{ success: boolean; backup: SocialBackupMetadata }>(`${API_BASE_URL}/auth/social-backup/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ lastUsedAt: true }),
  });
}
