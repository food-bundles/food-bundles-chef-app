import { create } from 'zustand';
import type { SalesRecord } from '@/domain/models/sales-record';
import { MOCK_SALES } from '@/data/mock/sales-mock';

interface SalesState {
  records: SalesRecord[];
  addRecord: (record: SalesRecord) => void;
  /** Last N weekly totals for a menuItem — newest last */
  getWeeklySales: (kitchenId: string, menuItemId: string, weeks?: number) => number[];
}

export const useSalesStore = create<SalesState>()((set, get) => ({
  records: MOCK_SALES,

  addRecord: (record) => set((s) => ({ records: [...s.records, record] })),

  getWeeklySales: (kitchenId, menuItemId, weeks = 4) => {
    const relevant = get()
      .records.filter(
        (r) => r.kitchenId === kitchenId && r.menuItemId === menuItemId,
      )
      .sort((a, b) => a.date.localeCompare(b.date));

    // Group by ISO week (use the date as weekly bucket key)
    const byWeek = new Map<string, number>();
    for (const r of relevant) {
      const existing = byWeek.get(r.date) ?? 0;
      byWeek.set(r.date, existing + r.portionsSold);
    }

    const totals = [...byWeek.values()];
    return totals.slice(-weeks);
  },
}));
