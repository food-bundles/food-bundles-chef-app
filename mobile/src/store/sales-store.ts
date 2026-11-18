import { create } from 'zustand';

// Stub — sales data served by useSales() hook.
/** Intentionally empty: no client state lives here any more. */
type SalesState = Record<string, never>;

export const useSalesStore = create<SalesState>()(() => ({}));
