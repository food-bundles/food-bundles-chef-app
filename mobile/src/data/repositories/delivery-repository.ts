import type { Delivery, DeliveryLineItem } from '@/domain/models/delivery';

export interface DeliveryRepository {
  listByKitchen(kitchenId: string): Promise<Delivery[]>;
  findById(id: string): Promise<Delivery | null>;
  create(delivery: Delivery): Promise<Delivery>;
  updateStatus(id: string, status: Delivery['status'], completedAt?: string): Promise<void>;
  updateLineItem(deliveryId: string, lineItemId: string, patch: Partial<DeliveryLineItem>): Promise<void>;
}
