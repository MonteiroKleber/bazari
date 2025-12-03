// path: apps/web/src/modules/cart/cart.store.ts
// PROPOSAL-003: Multi-Store Checkout - Suporte a múltiplos vendedores

import { useState, useEffect } from 'react';
import { create } from 'zustand';
import { persist, subscribeWithSelector, type PersistStorage, type StorageValue } from 'zustand/middleware';
import { getSessionUser, subscribeSession } from '@/modules/auth';

export interface CartItem {
  listingId: string;
  qty: number;
  priceBzrSnapshot: string; // planck
  titleSnapshot: string;
  sellerId: string;
  sellerName?: string; // PROPOSAL-003: Nome da loja para agrupamento
  kind: 'product' | 'service';
  addedAt: number; // timestamp
}

// PROPOSAL-003: Itens agrupados por vendedor
export interface CartStoreGroup {
  sellerId: string;
  sellerName: string;
  items: CartItem[];
  subtotalBzr: string;
}

interface CartState {
  items: CartItem[];
  // Actions
  addItem: (item: Omit<CartItem, 'addedAt'>) => Promise<boolean>;
  removeItem: (listingId: string) => void;
  updateQty: (listingId: string, qty: number) => void;
  clear: () => void;
  _rehydrate: () => void; // Internal: recarrega do localStorage quando sessão muda
}

// ============================================================================
// Seletores (funções puras para derivar dados do state)
// ============================================================================

export function selectSubtotalBzr(state: CartState): string {
  return calculateSubtotal(state.items);
}

export function selectCount(state: CartState): number {
  return state.items.reduce((sum, item) => sum + item.qty, 0);
}

export function selectCurrentSellerId(state: CartState): string | null {
  return state.items.length > 0 ? state.items[0].sellerId : null;
}

export function selectSellerIds(state: CartState): string[] {
  return [...new Set(state.items.map(i => i.sellerId))];
}

export function selectStoreCount(state: CartState): number {
  return selectSellerIds(state).length;
}

export function selectItemsByStore(state: CartState): CartStoreGroup[] {
  const groups: Record<string, CartStoreGroup> = {};

  for (const item of state.items) {
    if (!groups[item.sellerId]) {
      groups[item.sellerId] = {
        sellerId: item.sellerId,
        sellerName: item.sellerName || item.sellerId,
        items: [],
        subtotalBzr: '0',
      };
    }
    groups[item.sellerId].items.push(item);
  }

  // Calcular subtotal por loja
  for (const group of Object.values(groups)) {
    group.subtotalBzr = calculateSubtotal(group.items);
  }

  return Object.values(groups);
}

// Função para calcular subtotal
function parseDecimal(value: string): number {
  const normalized = (value || '').replace(',', '.').replace(/[^0-9.\-]/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function calculateSubtotal(items: CartItem[]): string {
  const total = items.reduce((sum, item) => {
    const price = parseDecimal(item.priceBzrSnapshot);
    return sum + price * item.qty;
  }, 0);
  return total.toString();
}

// Função para obter chave do localStorage baseada no usuário ativo
// Nota: usa getSessionUser() que é síncrona, não getActiveAccount() que é async
function getStorageKey(): string {
  const sessionUser = getSessionUser();
  const userIdentifier = sessionUser?.address || 'anonymous';
  return `bazari_cart_${userIdentifier}`;
}

// Custom storage que usa chave dinâmica baseada na sessão
type PersistedCartState = { items: CartItem[] };

const dynamicStorage: PersistStorage<PersistedCartState> = {
  getItem: (name: string): StorageValue<PersistedCartState> | null => {
    const key = getStorageKey();
    const item = localStorage.getItem(key);
    console.log('[cart.store] getItem called, key:', key, 'item:', item?.substring(0, 100));
    if (!item) return null;
    try {
      return JSON.parse(item) as StorageValue<PersistedCartState>;
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: StorageValue<PersistedCartState>): void => {
    const key = getStorageKey();
    console.log('[cart.store] setItem called, key:', key, 'items count:', value?.state?.items?.length);
    localStorage.setItem(key, JSON.stringify(value));
  },
  removeItem: (name: string): void => {
    const key = getStorageKey();
    console.log('[cart.store] removeItem called, key:', key);
    localStorage.removeItem(key);
  },
};

// Flag para indicar se o store já foi hidratado
let hasHydrated = false;

export const useCart = create<CartState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        items: [],

        addItem: async (newItem) => {
          const { items } = get();

          // PROPOSAL-003: Limite de 5 lojas por checkout
          const uniqueSellers = new Set(items.map(i => i.sellerId));
          if (!uniqueSellers.has(newItem.sellerId) && uniqueSellers.size >= 5) {
            // Retornar false para indicar limite atingido
            return false;
          }

          // Verificar se item já existe
          const existingItemIndex = items.findIndex(item => item.listingId === newItem.listingId);

          if (existingItemIndex >= 0) {
            // Atualizar quantidade do item existente
            const updatedItems = [...items];
            updatedItems[existingItemIndex] = {
              ...updatedItems[existingItemIndex],
              qty: updatedItems[existingItemIndex].qty + newItem.qty,
              priceBzrSnapshot: newItem.priceBzrSnapshot, // Atualizar preço
              titleSnapshot: newItem.titleSnapshot, // Atualizar título
              sellerName: newItem.sellerName || updatedItems[existingItemIndex].sellerName,
            };

            set({ items: updatedItems });
          } else {
            // Adicionar novo item
            const itemWithTimestamp: CartItem = {
              ...newItem,
              addedAt: Date.now(),
            };

            set({ items: [...items, itemWithTimestamp] });
          }

          return true;
        },

        removeItem: (listingId) => {
          set(state => ({
            items: state.items.filter(item => item.listingId !== listingId)
          }));
        },

        updateQty: (listingId, qty) => {
          if (qty <= 0) {
            get().removeItem(listingId);
            return;
          }

          set(state => ({
            items: state.items.map(item =>
              item.listingId === listingId ? { ...item, qty } : item
            )
          }));
        },

        clear: () => {
          set({ items: [] });
        },

        _rehydrate: () => {
          // Recarrega os itens do localStorage para o usuário atual
          const stored = dynamicStorage.getItem('cart');
          const items = stored?.state?.items || [];
          set({ items });
        },
      }),
      {
        name: 'cart', // Nome fixo, a chave real é computada pelo dynamicStorage
        storage: dynamicStorage,
        partialize: (state) => ({ items: state.items }),
        version: 1,
        onRehydrateStorage: () => {
          console.log('[cart.store] Starting rehydration...');
          return (state, error) => {
            if (error) {
              console.error('[cart.store] Rehydration error:', error);
            } else {
              console.log('[cart.store] Rehydration complete, items:', state?.items?.length || 0);
              hasHydrated = true;
            }
          };
        },
      }
    )
  )
);

// Hook para verificar se o store já foi hidratado
export function useCartHydrated() {
  const [hydrated, setHydrated] = useState(hasHydrated);

  useEffect(() => {
    // Se já hidratou, não precisa fazer nada
    if (hasHydrated) {
      setHydrated(true);
      return;
    }

    // Se não, verificar a cada 50ms até hidratar (máx 2s)
    let attempts = 0;
    const maxAttempts = 40;
    const interval = setInterval(() => {
      attempts++;
      if (hasHydrated || attempts >= maxAttempts) {
        setHydrated(hasHydrated);
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return hydrated;
}

// PROPOSAL-003: Hook para verificar limite de lojas
export function useCartStoreLimit() {
  const items = useCart(state => state.items);
  const addItem = useCart(state => state.addItem);
  const MAX_STORES = 5;
  const storeCount = selectStoreCount({ items } as CartState);

  const addItemWithLimitCheck = async (item: Omit<CartItem, 'addedAt'>) => {
    const success = await addItem(item);

    if (!success) {
      // Retornar dados para o modal de limite atingido
      return {
        limitReached: true,
        currentStoreCount: storeCount,
        maxStores: MAX_STORES,
        newItem: item,
      };
    }

    return { limitReached: false };
  };

  return {
    addItemWithLimitCheck,
    storeCount,
    maxStores: MAX_STORES,
    isAtLimit: storeCount >= MAX_STORES,
  };
}

// Manter hook antigo para compatibilidade (deprecado)
/** @deprecated Use useCartStoreLimit instead */
export function useCartSellerConflict() {
  const items = useCart(state => state.items);
  const clear = useCart(state => state.clear);
  const addItemStore = useCart(state => state.addItem);
  const { addItemWithLimitCheck, storeCount: currentStoreCount } = useCartStoreLimit();
  const currentSellerId = selectCurrentSellerId({ items } as CartState);

  const addItemWithConflictCheck = async (item: Omit<CartItem, 'addedAt'>) => {
    const result = await addItemWithLimitCheck(item);

    if (result.limitReached) {
      return {
        needsConfirmation: true,
        currentSeller: currentSellerId,
        newSeller: item.sellerId,
        newItem: item,
        // PROPOSAL-003: Novo campo
        limitReached: true,
        storeCount: currentStoreCount,
      };
    }

    return { needsConfirmation: false };
  };

  const confirmAndReplaceCart = (item: Omit<CartItem, 'addedAt'>) => {
    clear();
    return addItemStore(item);
  };

  return {
    addItemWithConflictCheck,
    confirmAndReplaceCart,
  };
}

// Migrar dados do formato antigo (chave fixa "cart") para o novo formato
function migrateOldCartData() {
  try {
    // Verificar se existe dados no formato antigo (chave fixa "cart")
    const oldData = localStorage.getItem('cart');
    if (oldData) {
      console.log('[cart.store] Found old cart data, migrating...');
      const parsed = JSON.parse(oldData);
      if (parsed?.state?.items && parsed.state.items.length > 0) {
        // Migrar para a nova chave do usuário atual
        const newKey = getStorageKey();
        // Verificar se a nova chave já tem dados
        const existingNew = localStorage.getItem(newKey);
        if (!existingNew) {
          localStorage.setItem(newKey, oldData);
          console.log('[cart.store] Migrated', parsed.state.items.length, 'items to', newKey);
        }
        // Remover dados antigos
        localStorage.removeItem('cart');
      }
    }
  } catch (e) {
    console.error('[cart.store] Migration error:', e);
  }
}

// Subscrever mudanças de sessão para recarregar carrinho do usuário correto
// Isso é executado quando o módulo é carregado
if (typeof window !== 'undefined') {
  // Migrar dados antigos primeiro
  migrateOldCartData();

  // Recarregar quando sessão expira ou é limpa
  subscribeSession(() => {
    useCart.getState()._rehydrate();
  });

  // Também escutar storage events para detectar login (cross-tab sync e setSession)
  let lastStorageKey = getStorageKey();
  window.addEventListener('storage', (e) => {
    if (e.key === 'bazari_session') {
      const newKey = getStorageKey();
      if (newKey !== lastStorageKey) {
        lastStorageKey = newKey;
        useCart.getState()._rehydrate();
      }
    }
  });

  // Verificar periodicamente se a sessão mudou (para capturar login na mesma aba)
  // Isso é necessário porque setSession não dispara storage event na mesma aba
  setInterval(() => {
    const newKey = getStorageKey();
    if (newKey !== lastStorageKey) {
      lastStorageKey = newKey;
      useCart.getState()._rehydrate();
    }
  }, 1000);
}
