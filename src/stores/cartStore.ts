import { create } from 'zustand';
import { products } from '@/mocks/products';

export interface CartLine {
  productId: string;
  qty: number;
}

interface CartState {
  lines: CartLine[];
  add: (productId: string) => void;
  /** Adds a specific quantity of a product in one call, merging with any existing line. */
  addQty: (productId: string, qty: number) => void;
  inc: (productId: string) => void;
  dec: (productId: string) => void;
  remove: (productId: string) => void;
  clear: () => void;
  itemCount: () => number;
  subtotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
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
  addQty: (productId, qty) =>
    set((state) => {
      const existing = state.lines.find((line) => line.productId === productId);
      if (existing) {
        return {
          lines: state.lines.map((line) =>
            line.productId === productId ? { ...line, qty: line.qty + qty } : line,
          ),
        };
      }
      return { lines: [...state.lines, { productId, qty }] };
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
}));
