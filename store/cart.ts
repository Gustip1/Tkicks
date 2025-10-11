import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Product, ProductVariant } from '@/types/db';

export interface CartItem {
  productId: string;
  slug: string;
  title: string;
  price: number;
  imageUrl: string | null;
  size: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  removeItem: (productId: string, size: string) => void;
  updateQty: (productId: string, size: string, qty: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      addItem: (item, qty = 1) =>
        set((state) => {
          const idx = state.items.findIndex(
            (it) => it.productId === item.productId && it.size === item.size
          );
          const items = [...state.items];
          if (idx >= 0) {
            items[idx] = { ...items[idx], quantity: items[idx].quantity + qty };
          } else {
            items.push({ ...item, quantity: qty });
          }
          return { items };
        }),
      removeItem: (productId, size) =>
        set((state) => ({
          items: state.items.filter((it) => !(it.productId === productId && it.size === size))
        })),
      updateQty: (productId, size, qty) =>
        set((state) => ({
          items: state.items.map((it) =>
            it.productId === productId && it.size === size
              ? { ...it, quantity: Math.max(1, qty) }
              : it
          )
        })),
      clear: () => set({ items: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false })
    }),
    {
      name: 'cart-store',
      storage: createJSONStorage(() => localStorage)
    }
  )
);



