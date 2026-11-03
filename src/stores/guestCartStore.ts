import { create } from 'zustand';
import { products } from '@/mocks/products';
import type { PaymentMethod } from '@/mocks/types';

const MINIMUM_ORDER = 100000;
const SMALL_ORDER_FEE = 5000;

export interface CartLine {
  productId: string;
  qty: number;
}

interface GuestCartState {
  lines: CartLine[];
  add: (productId: string) => void;
  inc: (productId: string) => void;
  dec: (productId: string) => void;
  remove: (productId: string) => void;
  clear: () => void;
  itemCount: () => number;
  subtotal: () => number;
  deliveryFee: () => number;
  total: () => number;
  allowedMethods: () => PaymentMethod[];
}

export const useGuestCartStore = create<GuestCartState>((set, get) => ({
  lines: [],
  add: (productId) =>
    set((state) => {
      const existing = state.lines.find((line) => line.productId === productId);
      if (existing) {
        return {
          lines: state.lines.map((line) =>
            line.productId === productId ? { ...line, qty: line.qty + 1 } : line,
          ),
        };
      }
      return { lines: [...state.lines, { productId, qty: 1 }] };
    }),
  inc: (productId) =>
    set((state) => ({
      lines: state.lines.map((line) =>
        line.productId === productId ? { ...line, qty: line.qty + 1 } : line,
      ),
    })),
  dec: (productId) =>
    set((state) => ({
      lines: state.lines
        .map((line) => (line.productId === productId ? { ...line, qty: line.qty - 1 } : line))
        .filter((line) => line.qty > 0),
    })),
  remove: (productId) =>
    set((state) => ({ lines: state.lines.filter((line) => line.productId !== productId) })),
  clear: () => set({ lines: [] }),
  itemCount: () => get().lines.reduce((sum, line) => sum + line.qty, 0),
  subtotal: () =>
    get().lines.reduce((sum, line) => {
      const product = products.find((p) => p.id === line.productId);
      return sum + (product ? product.price * line.qty : 0);
    }, 0),
  deliveryFee: () => (get().subtotal() > 0 && get().subtotal() < MINIMUM_ORDER ? SMALL_ORDER_FEE : 0),
  total: () => get().subtotal() + get().deliveryFee(),
  allowedMethods: () => ['MOBILE_MONEY', 'CARD'],
}));

export { MINIMUM_ORDER, SMALL_ORDER_FEE };
