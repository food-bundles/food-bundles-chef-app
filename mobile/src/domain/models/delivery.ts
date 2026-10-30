import type { AcceptanceDecision, QualityAssessment, PriceRecord } from '@/types';

export interface DeliveryLineItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  unit: string;
  orderedQuantity: number;
  acceptedQuantity?: number;
  /** Chef-entered actual price. Distinct from reference price. */
  actualPrice?: PriceRecord;
  referencePrice?: PriceRecord;
  qualityAssessment?: QualityAssessment;
  decision?: AcceptanceDecision;
  discrepancyReason?: string;
  photoUri?: string;
}

export type DeliveryStatus = 'pending' | 'in_progress' | 'completed';

export interface Delivery {
  id: string;
  kitchenId: string;
  orderId: string;
  supplierName: string;
  status: DeliveryStatus;
  lineItems: DeliveryLineItem[];
  scheduledAt?: string;
  completedAt?: string;
  notes?: string;
  createdAt: string;
}
