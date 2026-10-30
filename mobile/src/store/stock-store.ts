import { create } from 'zustand';
import type { StockItem } from '@/domain/models/stock-item';
import { MOCK_STOCK } from '@/data/mock/stock-mock';
import { calcDaysOfCover, isLowStock } from '@/domain/calculations/expected-use';

interface StockState {
  items: StockItem[];
  /** Items for a given kitchen sorted by days of cover ascending */
  getLowStockItems: (kitchenId: string) => StockItem[];
  updateQuantity: (id: string, quantity: number) => void;
  updateDailyUseRate: (id: string, rate: number) => void;
}

export const useStockStore = create<StockState>()((set, get) => ({
  items: MOCK_STOCK,

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

  updateQuantity: (id, quantity) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.id === id ? { ...i, quantityOnHand: quantity, lastUpdated: new Date().toISOString() } : i,
      ),
    })),

  updateDailyUseRate: (id, rate) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, dailyUseRate: rate } : i)),
    })),
}));
