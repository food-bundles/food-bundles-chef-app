import { create } from 'zustand';
import type { StockItem } from '@/domain/models/stock-item';

interface StockState {
  items: StockItem[];
  setItems: (items: StockItem[]) => void;
}

export const useStockStore = create<StockState>()((set) => ({
  items: [],
  setItems: (items) => set({ items }),
}));
