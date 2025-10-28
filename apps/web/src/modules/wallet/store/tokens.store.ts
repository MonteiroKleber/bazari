import { useCallback, useSyncExternalStore } from 'react';

export interface WalletToken {
  assetId: string;
  symbol: string;
  decimals: number;
  name: string;
  type: 'native' | 'asset';
  icon?: string;
}

type TokensState = Record<string, WalletToken[]>;

const STORAGE_KEY = 'wallet:tokens:v1';
const EMPTY_LIST: WalletToken[] = [];

let state: TokensState = {};
const listeners = new Set<() => void>();

// Cache to maintain stable array references when content doesn't change
const cache = new Map<string, { tokens: WalletToken[]; result: WalletToken[] }>();

function loadFromStorage(): TokensState {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as TokensState;
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch (error) {
    console.warn('[wallet] Failed to load tokens from storage:', error);
  }

  return {};
}

function persist() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('[wallet] Failed to persist tokens state:', error);
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

function initialise() {
  state = loadFromStorage();

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          state = JSON.parse(event.newValue) as TokensState;
          emit();
        } catch (error) {
          console.warn('[wallet] Failed to parse tokens storage update:', error);
        }
      }
    });
  }
}

initialise();

// Native BZR token (always present and first)
const NATIVE_BZR: WalletToken = {
  assetId: 'native',
  symbol: 'BZR',
  name: 'Bazari Token',
  decimals: 12,
  type: 'native',
  icon: '💎',
};

// ZARI governance token (default asset, always included after BZR)
const ZARI_TOKEN: WalletToken = {
  assetId: '1',
  symbol: 'ZARI',
  name: 'Bazari Governance Token',
  decimals: 12,
  type: 'asset',
  icon: '🏛️',
};

export function getTokens(address?: string | null): WalletToken[] {
  if (!address) {
    return EMPTY_LIST;
  }

  const tokens = state[address] ?? [];

  // Check if we have a cached result for this address with the same content
  const cached = cache.get(address);
  if (cached && arraysEqual(cached.tokens, tokens)) {
    // Content hasn't changed, return cached reference
    return cached.result;
  }

  // Content changed or no cache, compute new result
  let result: WalletToken[];

  // Always include BZR native first
  const hasNative = tokens.some((t) => t.assetId === 'native');
  // Always include ZARI after BZR (if not already in list)
  const hasZari = tokens.some((t) => t.assetId === '1');

  if (!hasNative && !hasZari) {
    result = [NATIVE_BZR, ZARI_TOKEN, ...tokens];
  } else if (!hasNative) {
    result = [NATIVE_BZR, ...tokens];
  } else if (!hasZari) {
    // Find position after native to insert ZARI
    const nativeIndex = tokens.findIndex((t) => t.assetId === 'native');
    result = [
      ...tokens.slice(0, nativeIndex + 1),
      ZARI_TOKEN,
      ...tokens.slice(nativeIndex + 1),
    ];
  } else {
    // Sort to ensure native is always first
    result = [...tokens].sort((a, b) => {
      if (a.assetId === 'native') return -1;
      if (b.assetId === 'native') return 1;
      return 0;
    });
  }

  // Update cache with new reference
  cache.set(address, { tokens: [...tokens], result });
  return result;
}

// Helper to check if two arrays have the same tokens (by assetId)
function arraysEqual(a: WalletToken[], b: WalletToken[]): boolean {
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    if (a[i].assetId !== b[i].assetId) return false;
  }

  return true;
}

export function setTokens(address: string, tokens: WalletToken[]): WalletToken[] {
  state = {
    ...state,
    [address]: tokens,
  };
  // Invalidate cache for this address since tokens changed
  cache.delete(address);
  persist();
  emit();
  return tokens;
}

export function addToken(address: string, token: WalletToken): WalletToken[] {
  const list = getTokens(address);
  const exists = list.some((entry) => entry.assetId === token.assetId);
  const next = exists ? list : [...list, token];
  return setTokens(address, next);
}

export function removeToken(address: string, assetId: string): WalletToken[] {
  // Prevent removing native BZR token
  if (assetId === 'native') {
    console.warn('[wallet] Cannot remove native BZR token');
    return getTokens(address);
  }

  const list = getTokens(address);
  const next = list.filter((entry) => entry.assetId !== assetId);
  return setTokens(address, next);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTokens(address?: string | null): WalletToken[] {
  const getSnapshot = useCallback(() => getTokens(address), [address]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function clearTokens(address?: string) {
  if (!address) {
    state = {};
    cache.clear(); // Clear entire cache
  } else {
    const { [address]: _, ...rest } = state;
    state = rest;
    cache.delete(address); // Clear cache for this address
  }
  persist();
  emit();
}

export function getAllTokens() {
  return state;
}
