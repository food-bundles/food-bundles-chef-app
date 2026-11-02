import { create } from 'zustand';
import type { Delivery, DeliveryLineItem } from '@/domain/models/delivery';
import type { QualityAssessment, AcceptanceDecision, PriceRecord } from '@/types';
import { MOCK_DELIVERIES } from '@/data/mock/deliveries-mock';
import { deliveryRepo } from '@/data/service-container';

interface DeliveryState {
  deliveries: Delivery[];
  /** Replace the full delivery list (used by hydration from SQLite) */
  setDeliveries: (deliveries: Delivery[]) => void;
  /** Update a single line item with quality, quantity, price, and decision */
  updateLineItem: (
    deliveryId: string,
    lineItemId: string,
    patch: Partial<Pick<DeliveryLineItem,
      | 'acceptedQuantity'
      | 'actualPrice'
      | 'qualityAssessment'
      | 'decision'
      | 'discrepancyReason'
      | 'photoUri'
    >>,
  ) => void;
  startDelivery: (deliveryId: string) => void;
  completeDelivery: (deliveryId: string) => void;
}

export const useDeliveryStore = create<DeliveryState>()((set) => ({
  deliveries: MOCK_DELIVERIES,

  setDeliveries: (deliveries) => set({ deliveries }),

  updateLineItem: (deliveryId, lineItemId, patch) => {
    set((s) => ({
      deliveries: s.deliveries.map((d) =>
        d.id !== deliveryId
          ? d
          : {
              ...d,
              lineItems: d.lineItems.map((li) =>
                li.id !== lineItemId ? li : { ...li, ...patch },
              ),
            },
      ),
    }));
    deliveryRepo.updateLineItem(deliveryId, lineItemId, patch).catch(() => {});
  },

  startDelivery: (deliveryId) => {
    set((s) => ({
      deliveries: s.deliveries.map((d) =>
        d.id === deliveryId ? { ...d, status: 'in_progress' } : d,
      ),
    }));
    deliveryRepo.updateStatus(deliveryId, 'in_progress').catch(() => {});
  },

  completeDelivery: (deliveryId) => {
    const completedAt = new Date().toISOString();
    set((s) => ({
      deliveries: s.deliveries.map((d) =>
        d.id === deliveryId
          ? { ...d, status: 'completed', completedAt }
          : d,
      ),
    }));
    deliveryRepo.updateStatus(deliveryId, 'completed', completedAt).catch(() => {});
  },
}));
