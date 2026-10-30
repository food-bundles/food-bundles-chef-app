import { create } from 'zustand';
import type { Delivery, DeliveryLineItem } from '@/domain/models/delivery';
import type { QualityAssessment, AcceptanceDecision, PriceRecord } from '@/types';
import { MOCK_DELIVERIES } from '@/data/mock/deliveries-mock';

interface DeliveryState {
  deliveries: Delivery[];
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

  updateLineItem: (deliveryId, lineItemId, patch) =>
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
    })),

  startDelivery: (deliveryId) =>
    set((s) => ({
      deliveries: s.deliveries.map((d) =>
        d.id === deliveryId ? { ...d, status: 'in_progress' } : d,
      ),
    })),

  completeDelivery: (deliveryId) =>
    set((s) => ({
      deliveries: s.deliveries.map((d) =>
        d.id === deliveryId
          ? { ...d, status: 'completed', completedAt: new Date().toISOString() }
          : d,
      ),
    })),
}));
