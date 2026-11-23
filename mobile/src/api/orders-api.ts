import type { MoneyDto } from './money-dto';
import { request, type WriteOptions } from './http-client';

// ── DTOs ─────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'draft'
  | 'submitted'
  | 'confirmed'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface OrderLineCreateBody {
  catalog_product_id: string;
  product_name: string;
  unit: string;
  quantity_ordered: string;   // decimal string
  unit_price: string;         // decimal string
  /** ISO 4217; defaults to the kitchen currency. */
  unit_price_currency?: string;
  ingredient_id?: string | null;
}

export interface OrderCreateBody {
  delivery_date?: string | null;  // ISO date "YYYY-MM-DD"
  notes?: string | null;
  /** Phase 9: how the requisition is bought. */
  route?: 'pay' | 'restaurant' | 'whatsapp' | null;
  lines: OrderLineCreateBody[];
}

export interface OrderLineDto {
  id: string;
  order_id: string;
  catalog_product_id: string;
  product_name: string;
  unit: string;
  quantity_ordered: string;
  /** Deprecated (one release): use unit_price_money. */
  unit_price: string;
  unit_price_currency: string | null;
  unit_price_money: MoneyDto | null;
  ingredient_id: string | null;
}

export interface OrderDto {
  id: string;
  kitchen_id: string;
  chef_id: string;
  external_order_id: string | null;
  status: OrderStatus;
  delivery_date: string | null;
  notes: string | null;
  route?: 'pay' | 'restaurant' | 'whatsapp' | null;
  created_at: string;
  updated_at: string;
}

export interface OrderWithLinesDto extends OrderDto {
  lines: OrderLineDto[];
}

export interface OrderSubmitDto {
  order_id: string;
  external_order_id: string | null;
  status: OrderStatus;
  message: string;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export function listOrders(kitchenId: string): Promise<OrderDto[]> {
  return request<OrderDto[]>(`/kitchens/${kitchenId}/orders`);
}

export function getOrder(kitchenId: string, orderId: string): Promise<OrderWithLinesDto> {
  return request<OrderWithLinesDto>(`/kitchens/${kitchenId}/orders/${orderId}`);
}

export function createOrder(
  kitchenId: string,
  body: OrderCreateBody,
  opts: WriteOptions = {}
): Promise<OrderWithLinesDto> {
  return request<OrderWithLinesDto>(`/kitchens/${kitchenId}/orders`, {
    method: 'POST',
    body,
    idempotencyKey: opts.idempotencyKey,
  });
}

export function submitOrder(kitchenId: string, orderId: string, opts: WriteOptions = {}): Promise<OrderSubmitDto> {
  return request<OrderSubmitDto>(`/kitchens/${kitchenId}/orders/${orderId}/submit`, {
    method: 'POST',
    idempotencyKey: opts.idempotencyKey,
  });
}

export function confirmOrder(kitchenId: string, orderId: string, opts: WriteOptions = {}): Promise<OrderSubmitDto> {
  return request<OrderSubmitDto>(`/kitchens/${kitchenId}/orders/${orderId}/confirm`, {
    method: 'POST',
    idempotencyKey: opts.idempotencyKey,
  });
}

export function cancelOrder(kitchenId: string, orderId: string, opts: WriteOptions = {}): Promise<OrderSubmitDto> {
  return request<OrderSubmitDto>(`/kitchens/${kitchenId}/orders/${orderId}/cancel`, {
    method: 'POST',
    idempotencyKey: opts.idempotencyKey,
  });
}
