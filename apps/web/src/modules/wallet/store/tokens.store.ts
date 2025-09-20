import { useCallback, useSyncExternalStore } from 'react';

export interface WalletToken {
  assetId: string;
  symbol: string;
  decimals: number;
  name?: string;
}

type TokensState = Record<string, WalletToken[]>;

const STORAGE_KEY = 'wallet:tokens:v1';
const EMPTY_LIST: WalletToken[] = [];

let state: TokensState = {};
const listeners = new Set<() => void>();

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

export function getTokens(address?: string | null): WalletToken[] {
  if (!address) {
    return EMPTY_LIST;
  }

  return state[address] ?? EMPTY_LIST;
}

export function setTokens(address: string, tokens: WalletToken[]): WalletToken[] {
  state = {
    ...state,
    [address]: tokens,
  };
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
  } else {
    const { [address]: _, ...rest } = state;
    state = rest;
  }
  persist();
  emit();
}

export function getAllTokens() {
  return state;
}
