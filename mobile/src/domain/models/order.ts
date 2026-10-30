export type OrderStatus =
  | 'draft'
  | 'submitted'
  | 'confirmed'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface OrderLineItem {
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPriceRwf: number;
}

export interface Order {
  id: string;
  kitchenId: string;
  status: OrderStatus;
  lineItems: OrderLineItem[];
  totalRwf: number;
  placedAt?: string;
  expectedDeliveryAt?: string;
  notes?: string;
  createdAt: string;
}
