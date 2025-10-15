import { API_BASE_URL } from '../../config';
import { SessionPayload, setSession, clearSession, getAccessToken } from './session';

export interface NonceResponse {
  nonce: string;
  domain: string;
  uri: string;
  genesisHash: string;
  issuedAt: string;
  expiresAt: string;
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const token = getAccessToken();

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
