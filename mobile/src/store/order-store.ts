import { create } from 'zustand';
import type { Order, OrderLineItem } from '@/domain/models/order';
import type { CatalogProduct } from '@/domain/models/catalog-product';
import { MOCK_ORDERS } from '@/data/mock/orders-mock';

interface CartItem {
  product: CatalogProduct;
  quantity: number;
}

interface OrderState {
  orders: Order[];
  cart: CartItem[];
  setCartQuantity: (product: CatalogProduct, quantity: number) => void;
  clearCart: () => void;
  submitOrder: (kitchenId: string, notes?: string) => Order;
  cancelOrder: (orderId: string) => void;
  cartTotal: () => number;
}

export const useOrderStore = create<OrderState>()((set, get) => ({
  orders: MOCK_ORDERS,
  cart: [],

  setCartQuantity: (product, quantity) =>
    set((s) => {
      const existing = s.cart.findIndex((c) => c.product.id === product.id);
      if (quantity <= 0) {
        return { cart: s.cart.filter((c) => c.product.id !== product.id) };
      }
      if (existing >= 0) {
        const next = [...s.cart];
        next[existing] = { product, quantity };
        return { cart: next };
      }
      return { cart: [...s.cart, { product, quantity }] };
    }),

  clearCart: () => set({ cart: [] }),

  submitOrder: (kitchenId, notes) => {
    const { cart } = get();
    const lineItems: OrderLineItem[] = cart.map((c) => ({
      productId: c.product.id,
      productName: c.product.name,
      unit: c.product.unit,
      quantity: c.quantity,
      unitPriceRwf: c.product.unitPriceRwf,
    }));
    const totalRwf = lineItems.reduce((sum, l) => sum + l.quantity * l.unitPriceRwf, 0);
    const order: Order = {
      id: `ord-${Date.now()}`,
      kitchenId,
      status: 'submitted',
      lineItems,
      totalRwf,
      placedAt: new Date().toISOString(),
      notes,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ orders: [order, ...s.orders], cart: [] }));
    return order;
  },

  cancelOrder: (orderId) =>
    set((s) => ({
      orders: s.orders.map((o) =>
        o.id === orderId && o.status === 'submitted'
          ? { ...o, status: 'cancelled' }
          : o,
      ),
    })),

  cartTotal: () =>
    get().cart.reduce((sum, c) => sum + c.quantity * c.product.unitPriceRwf, 0),
}));
