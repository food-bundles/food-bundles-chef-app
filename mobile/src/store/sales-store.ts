import { create } from 'zustand';
import type { SalesRecord } from '@/domain/models/sales-record';
import { MOCK_SALES } from '@/data/mock/sales-mock';
import { salesRepo } from '@/data/service-container';

interface SalesState {
  records: SalesRecord[];
  /** Replace the full record list (used by hydration from SQLite) */
  setRecords: (records: SalesRecord[]) => void;
  addRecord: (record: SalesRecord) => void;
  /** Last N weekly totals for a menuItem — newest last */
  getWeeklySales: (kitchenId: string, menuItemId: string, weeks?: number) => number[];
}

export const useSalesStore = create<SalesState>()((set, get) => ({
  records: MOCK_SALES,

  setRecords: (records) => set({ records }),

  addRecord: (record) => {
    set((s) => ({ records: [...s.records, record] }));
    salesRepo.create(record).catch(() => {
      // SQLite write failure — record already in Zustand; mutation queue will retry
    });
  },

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
