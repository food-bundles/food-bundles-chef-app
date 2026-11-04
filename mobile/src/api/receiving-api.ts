import { request } from './http-client';

// ── DTOs ─────────────────────────────────────────────────────────────────────

// Hyphen preserved — matches backend ReceivingDecision enum and mobile AcceptanceDecision.
export type ReceivingDecision = 'accepted' | 'partially-accepted' | 'rejected';

export interface ReceivingLineBody {
  order_line_id: string;
  quantity_received: string;    // decimal string
  decision?: ReceivingDecision;
  rejection_reason?: string | null;
}

export interface BulkReceivingBody {
  lines: ReceivingLineBody[];
}

export interface ReceivingLineDto {
  id: string;
  order_line_id: string;
  kitchen_id: string;
  quantity_received: string;
  decision: ReceivingDecision;
  rejection_reason: string | null;
  short_delivery: boolean;
  received_by: string | null;
  received_at: string;
}

// ── API calls ─────────────────────────────────────────────────────────────────

/**
 * Record delivery receiving for one order.
 *
 * Manual receiving must always work — this call is not gated on AI/photo availability.
 * The chef's decision and measured quantities are always authoritative.
 */
export function startDelivery(
  kitchenId: string,
  orderId: string,
): Promise<{ order_id: string; status: string; message: string }> {
  return request(`/kitchens/${kitchenId}/orders/${orderId}/receiving/start`, {
    method: 'POST',
  });
}

export function receiveDelivery(
  kitchenId: string,
  orderId: string,
  body: BulkReceivingBody
): Promise<ReceivingLineDto[]> {
  return request<ReceivingLineDto[]>(
    `/kitchens/${kitchenId}/orders/${orderId}/receiving`,
    { method: 'POST', body }
  );
}
