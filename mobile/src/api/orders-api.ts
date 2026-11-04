import { request } from './http-client';

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
  ingredient_id?: string | null;
}

export interface OrderCreateBody {
  delivery_date?: string | null;  // ISO date "YYYY-MM-DD"
  notes?: string | null;
  lines: OrderLineCreateBody[];
}

export interface OrderLineDto {
  id: string;
  order_id: string;
  catalog_product_id: string;
  product_name: string;
  unit: string;
  quantity_ordered: string;
  unit_price: string;
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
  body: OrderCreateBody
): Promise<OrderWithLinesDto> {
  return request<OrderWithLinesDto>(`/kitchens/${kitchenId}/orders`, {
    method: 'POST',
    body,
  });
}

export function submitOrder(kitchenId: string, orderId: string): Promise<OrderSubmitDto> {
  return request<OrderSubmitDto>(`/kitchens/${kitchenId}/orders/${orderId}/submit`, {
    method: 'POST',
  });
}

export function confirmOrder(kitchenId: string, orderId: string): Promise<OrderSubmitDto> {
  return request<OrderSubmitDto>(`/kitchens/${kitchenId}/orders/${orderId}/confirm`, {
    method: 'POST',
  });
}

export function cancelOrder(kitchenId: string, orderId: string): Promise<OrderSubmitDto> {
  return request<OrderSubmitDto>(`/kitchens/${kitchenId}/orders/${orderId}/cancel`, {
    method: 'POST',
  });
}
