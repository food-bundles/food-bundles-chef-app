import { create } from 'zustand';
import { orders as seedOrders } from '@/mocks/orders';
import { ORDER_STEPS, type Order } from '@/mocks/types';
import { sleep, getCache, setCache, clearCache } from '@/lib';

export type AsyncStatus = 'idle' | 'loading' | 'ready' | 'error';

const CACHE_KEY = 'orders_list';
const CACHE_TTL_MS = 30_000;

export interface OrderStatusAdvance {
  orderId: string;
  newStatus: (typeof ORDER_STEPS)[number];
}

interface OrdersState {
  status: AsyncStatus;
  orders: Order[];
  fetch: () => Promise<void>;
  refresh: () => Promise<void>;
  simulateFailure: () => Promise<void>;
  /** Advances the given order's step by one (mock status-change simulation). Returns
   * the new status, or null if the order is missing or already at the final step. */
  advanceOrderStatus: (orderId: string) => OrderStatusAdvance | null;
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
  status: 'idle',
  orders: [],
  fetch: async () => {
    set({ status: 'loading' });
    const cached = await getCache<Order[]>(CACHE_KEY);
    if (cached) {
      set({ status: 'ready', orders: cached });
      return;
    }
    await sleep(900);
    await setCache(CACHE_KEY, seedOrders, CACHE_TTL_MS);
    set({ status: 'ready', orders: seedOrders });
  },
  refresh: async () => {
    set({ status: 'loading' });
    await sleep(900);
    await setCache(CACHE_KEY, seedOrders, CACHE_TTL_MS);
    set({ status: 'ready', orders: seedOrders });
  },
  simulateFailure: async () => {
    set({ status: 'loading' });
    await sleep(900);
    set({ status: 'error', orders: [] });
  },
  advanceOrderStatus: (orderId) => {
    const order = get().orders.find((o) => o.id === orderId);
    if (!order) return null;

    const currentIndex = ORDER_STEPS.indexOf(order.status as (typeof ORDER_STEPS)[number]);
    if (currentIndex === -1 || currentIndex >= ORDER_STEPS.length - 1) return null;

    const newStatus = ORDER_STEPS[currentIndex + 1];
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId ? { ...o, status: newStatus, step: currentIndex + 2 } : o,
      ),
    }));
    clearCache(CACHE_KEY);
    return { orderId, newStatus };
  },
}));
