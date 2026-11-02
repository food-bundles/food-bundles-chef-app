import { create } from 'zustand';
import type { StockItem } from '@/domain/models/stock-item';
import { MOCK_STOCK } from '@/data/mock/stock-mock';
import { calcDaysOfCover, isLowStock } from '@/domain/calculations/expected-use';
import { stockRepo } from '@/data/service-container';

interface StockState {
  items: StockItem[];
  /** Replace the full item list (used by hydration from SQLite) */
  setItems: (items: StockItem[]) => void;
  /** Items for a given kitchen sorted by days of cover ascending */
  getLowStockItems: (kitchenId: string) => StockItem[];
  updateQuantity: (id: string, quantity: number) => void;
  updateDailyUseRate: (id: string, rate: number) => void;
}

export const useStockStore = create<StockState>()((set, get) => ({
  items: MOCK_STOCK,

  setItems: (items) => set({ items }),

  getLowStockItems: (kitchenId) =>
    get()
      .items.filter(
        (i) => i.kitchenId === kitchenId && isLowStock(i.quantityOnHand, i.dailyUseRate),
      )
      .sort(
        (a, b) =>
          calcDaysOfCover(a.quantityOnHand, a.dailyUseRate) -
          calcDaysOfCover(b.quantityOnHand, b.dailyUseRate),
      ),

  updateQuantity: (id, quantity) => {
    set((s) => ({
      items: s.items.map((i) =>
        i.id === id ? { ...i, quantityOnHand: quantity, lastUpdated: new Date().toISOString() } : i,
      ),
    }));
    stockRepo.updateQuantity(id, quantity).catch(() => {});
  },

  updateDailyUseRate: (id, rate) => {
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, dailyUseRate: rate } : i)),
    }));
    stockRepo.updateDailyUseRate(id, rate).catch(() => {});
  },
}));
