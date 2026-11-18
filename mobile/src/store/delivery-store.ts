import { create } from 'zustand';

// Stub — delivery data served by useDeliveries() / useDeliveryDetail() hooks.
/** Intentionally empty: no client state lives here any more. */
type DeliveryState = Record<string, never>;

export const useDeliveryStore = create<DeliveryState>()(() => ({}));
