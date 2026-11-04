import { create } from 'zustand';

// Stub — sales data served by useSales() hook.
interface SalesState {
  // intentionally empty
}

export const useSalesStore = create<SalesState>()(() => ({}));
