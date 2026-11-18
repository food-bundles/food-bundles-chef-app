import { create } from 'zustand';

// Minimal stub — cart state moved to purchasing screen local state.
// Kept for backwards-compatibility until all screen imports are removed.
/** Intentionally empty: no client state lives here any more. */
type OrderState = Record<string, never>;

export const useOrderStore = create<OrderState>()(() => ({}));
