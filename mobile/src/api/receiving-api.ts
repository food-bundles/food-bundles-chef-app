import { request, type WriteOptions } from './http-client';

// ── DTOs ─────────────────────────────────────────────────────────────────────

// Hyphen preserved — matches backend ReceivingDecision enum and mobile AcceptanceDecision.
export type ReceivingDecision = 'accepted' | 'partially-accepted' | 'rejected';

export interface ReceivingLineBody {
  order_line_id: string;
  quantity_received: string;    // decimal string
  decision?: ReceivingDecision;
  rejection_reason?: string | null;
  /** Phase 9: Good / Issue and the reasons (delivery-quality signals). */
  quality?: 'good' | 'issue' | null;
  issue_reasons?: ('short_weight' | 'damaged' | 'not_fresh')[];
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
  quality?: 'good' | 'issue' | null;
  issue_reasons?: string[];
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
  opts: WriteOptions = {},
): Promise<{ order_id: string; status: string; message: string }> {
  return request(`/kitchens/${kitchenId}/orders/${orderId}/receiving/start`, {
    method: 'POST',
    idempotencyKey: opts.idempotencyKey,
  });
}

export function receiveDelivery(
  kitchenId: string,
  orderId: string,
  body: BulkReceivingBody,
  opts: WriteOptions = {}
): Promise<ReceivingLineDto[]> {
  return request<ReceivingLineDto[]>(
    `/kitchens/${kitchenId}/orders/${orderId}/receiving`,
    { method: 'POST', body, idempotencyKey: opts.idempotencyKey }
  );
}
