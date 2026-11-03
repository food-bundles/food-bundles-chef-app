import { create } from 'zustand';

// Minimal stub — cart state moved to purchasing screen local state.
// Kept for backwards-compatibility until all screen imports are removed.
interface OrderState {
  // intentionally empty
}

export const useOrderStore = create<OrderState>()(() => ({}));
