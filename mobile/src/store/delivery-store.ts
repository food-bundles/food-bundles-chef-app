import { create } from 'zustand';

// Stub — delivery data served by useDeliveries() / useDeliveryDetail() hooks.
interface DeliveryState {
  // intentionally empty
}

export const useDeliveryStore = create<DeliveryState>()(() => ({}));
