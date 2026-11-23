/**
 * 04 · Receive delivery (Food Bundles UX spec; docs/domain-rules.md).
 *
 * The received quantity starts EMPTY so the chef must weigh. A line is "checked" once it has a
 * quantity; its quality is Good or Issue (Issue reasons: short weight, damaged, not fresh).
 * Confirm is allowed with unchecked lines after a warning: they count as not received.
 */

export type Quality = 'good' | 'issue';
export type IssueReason = 'short_weight' | 'damaged' | 'not_fresh';
export const ISSUE_REASONS: readonly IssueReason[] = ['short_weight', 'damaged', 'not_fresh'];

/** Short delivery: more than 5 % below the ordered quantity (existing product rule). */
export const SHORT_DELIVERY_FRACTION = 0.05;

export interface ReceiveLine {
  orderLineId: string;
  ordered: number;
  /** As typed; empty until weighed. */
  received: string;
  quality: Quality | null;
  reasons: IssueReason[];
}

/** "7,0" / "7.0" → 7; empty or invalid → null. */
export function parseReceived(text: string): number | null {
  const normal = text.trim().replace(',', '.');
  if (!normal) return null;
  const n = Number(normal);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Checked = a quantity was entered. */
export function isChecked(line: ReceiveLine): boolean {
  return parseReceived(line.received) !== null;
}

/** "5 of 6 checked". */
export function checkedCount(lines: readonly ReceiveLine[]): { checked: number; total: number } {
  return { checked: lines.filter(isChecked).length, total: lines.length };
}

/** True when the received quantity is more than 5 % below the ordered one. */
export function isShortWeight(ordered: number, received: number): boolean {
  return ordered > 0 && received < ordered * (1 - SHORT_DELIVERY_FRACTION);
}

/**
 * The tag and reasons after the chef types a quantity: a short weight is suggested as an
 * Issue (the chef can change it); otherwise Good, unless the chef already chose Issue.
 */
export function afterWeighing(line: ReceiveLine): Pick<ReceiveLine, 'quality' | 'reasons'> {
  const received = parseReceived(line.received);
  if (received === null) return { quality: null, reasons: [] };
  if (isShortWeight(line.ordered, received)) {
    const reasons = line.reasons.includes('short_weight') ? line.reasons : ['short_weight' as const, ...line.reasons];
    return { quality: 'issue', reasons };
  }
  if (line.quality === 'issue') {
    return { quality: 'issue', reasons: line.reasons.filter((r) => r !== 'short_weight') };
  }
  return { quality: 'good', reasons: [] };
}

export interface ReceivingLinePayload {
  order_line_id: string;
  quantity_received: string;
  decision: 'accepted' | 'rejected';
  rejection_reason?: string;
  quality?: Quality;
  issue_reasons?: IssueReason[];
}

/** The lines sent on Confirm. Unchecked lines are sent as not received (0, rejected). */
export function receivingPayload(lines: readonly ReceiveLine[]): ReceivingLinePayload[] {
  return lines.map((line) => {
    const received = parseReceived(line.received);
    if (received === null) {
      return { order_line_id: line.orderLineId, quantity_received: '0', decision: 'rejected', rejection_reason: 'not_received' };
    }
    return {
      order_line_id: line.orderLineId,
      quantity_received: String(received),
      decision: 'accepted',
      quality: line.quality ?? 'good',
      issue_reasons: line.quality === 'issue' ? line.reasons : [],
    };
  });
}
