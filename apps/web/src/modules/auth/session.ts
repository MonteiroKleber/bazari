import { API_BASE_URL } from '../../config';

type SessionUser = { id: string; address: string };

export interface SessionPayload {
  accessToken: string;
  accessTokenExpiresIn: number;
  user: SessionUser;
}

interface SessionState extends SessionPayload {
  expiresAt: number;
}

export type SessionEvent = 'expired' | 'cleared';

// Load initial state from localStorage
function loadStateFromStorage(): SessionState | null {
  try {
    const stored = localStorage.getItem('bazari_session');
    if (!stored) return null;
    const parsed = JSON.parse(stored) as SessionState;
    // Check if session is expired
    if (parsed.expiresAt < Date.now()) {
      localStorage.removeItem('bazari_session');
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveStateToStorage(state: SessionState | null) {
  if (state) {
    localStorage.setItem('bazari_session', JSON.stringify(state));
  } else {
    localStorage.removeItem('bazari_session');
  }
}

let state: SessionState | null = loadStateFromStorage();
let refreshPromise: Promise<boolean> | null = null;
const listeners = new Set<(event: SessionEvent) => void>();
let reauthInProgress = false;

function notify(event: SessionEvent) {
  listeners.forEach((listener) => listener(event));
}

export function subscribeSession(listener: (event: SessionEvent) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function beginReauth() {
  reauthInProgress = true;
}

export function endReauth() {
  reauthInProgress = false;
}

export function isReauthInProgress() {
  return reauthInProgress;
}

export function getSessionUser() {
  return state?.user ?? null;
}

export function getAccessToken() {
  return state?.accessToken ?? null;
}

export function isSessionActive() {
  return Boolean(state);
}

export function setSession(payload: SessionPayload) {
  state = {
    ...payload,
    expiresAt: Date.now() + payload.accessTokenExpiresIn * 1000,
  };
  saveStateToStorage(state);
}

export function clearSession(event: SessionEvent = 'cleared') {
  state = null;
  saveStateToStorage(null);
  notify(event);
}

async function requestRefresh(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return false;
    }

    const data = (await response.json()) as SessionPayload;
    setSession(data);
    return true;
  } catch (error) {
    console.error('Failed to refresh session', error);
    return false;
  }
}

export async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = requestRefresh().finally(() => {
      refreshPromise = null;
    });
  }

  const refreshed = await refreshPromise;
  if (!refreshed) {
    clearSession('expired');
  }
  return refreshed;
}

export async function ensureFreshAccessToken() {
  if (!state) {
    return;
  }
  const FIVE_SECONDS = 5_000;
  if (state.expiresAt - Date.now() < FIVE_SECONDS) {
    await refreshSession();
  }
}
