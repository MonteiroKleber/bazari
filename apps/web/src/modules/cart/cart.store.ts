// path: apps/web/src/modules/cart/cart.store.ts

import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { getActiveAccount } from '@/modules/auth';

export interface CartItem {
  listingId: string;
  qty: number;
  priceBzrSnapshot: string; // planck
  titleSnapshot: string;
  sellerId: string;
  kind: 'product' | 'service';
  addedAt: number; // timestamp
}

interface CartState {
  items: CartItem[];
  // Actions
  addItem: (item: Omit<CartItem, 'addedAt'>) => Promise<boolean>;
  removeItem: (listingId: string) => void;
  updateQty: (listingId: string, qty: number) => void;
  clear: () => void;
  // Computed
  subtotalBzr: string;
  count: number;
  currentSellerId: string | null;
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
function getStorageKey(): string {
  const activeAccount = getActiveAccount();
  const userIdentifier = activeAccount?.address || 'anonymous';
  return `bazari_cart_${userIdentifier}`;
}

export const useCart = create<CartState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        items: [],

        addItem: async (newItem) => {
          const { items } = get();
          const currentSellerId = items.length > 0 ? items[0].sellerId : null;

          // Verificar regra MVP: 1 vendedor por carrinho
          if (currentSellerId && currentSellerId !== newItem.sellerId) {
            // Retornar false para indicar que precisa de confirmação
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

        // Computed values
        get subtotalBzr() {
          return calculateSubtotal(get().items);
        },

        get count() {
          return get().items.reduce((sum, item) => sum + item.qty, 0);
        },

        get currentSellerId() {
          const { items } = get();
          return items.length > 0 ? items[0].sellerId : null;
        },
      }),
      {
        name: getStorageKey(),
        // Recomputar a chave quando o usuário ativo mudar
        partialize: (state) => ({ items: state.items }),
        version: 1,
      }
    )
  )
);

// Hook para modal de confirmação de mudança de vendedor
export function useCartSellerConflict() {
  const cart = useCart();

  const addItemWithConflictCheck = async (item: Omit<CartItem, 'addedAt'>) => {
    const success = await cart.addItem(item);

    if (!success) {
      // Retornar dados para o modal de confirmação
      return {
        needsConfirmation: true,
        currentSeller: cart.currentSellerId,
        newSeller: item.sellerId,
        newItem: item,
      };
    }

    return { needsConfirmation: false };
  };

  const confirmAndReplaceCart = (item: Omit<CartItem, 'addedAt'>) => {
    cart.clear();
    return cart.addItem(item);
  };

  return {
    addItemWithConflictCheck,
    confirmAndReplaceCart,
  };
}
