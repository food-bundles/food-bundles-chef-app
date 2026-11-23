/**
 * Requisition (spec screens 11–12; docs/domain-rules.md). The server suggests the quantities;
 * these pure helpers drive the steppers, totals and the WhatsApp message.
 */

/** Round up to a whole number of packs (pack ≤ 0 → 1). */
export function ceilToPack(qty: number, pack: number): number {
  if (!(qty > 0)) return 0;
  const size = pack > 0 ? pack : 1;
  return Math.round(Math.ceil(qty / size - 1e-9) * size * 1000) / 1000;
}

/** − / + in pack sizes; below one pack the line is removed (0). */
export function stepQty(qty: number, pack: number, direction: 1 | -1): number {
  const size = pack > 0 ? pack : 1;
  const next = Math.round((qty + direction * size) * 1000) / 1000;
  return next < size ? 0 : next;
}

export interface ReqLine {
  key: string;
  name: string;
  unit: string;
  qty: number;
  pricePerUnit: number | null;
  currency: string | null;
}

/** Line total in its currency, or null without a price. */
export function lineTotal(line: Pick<ReqLine, 'qty' | 'pricePerUnit'>): number | null {
  return line.pricePerUnit === null ? null : Math.round(line.qty * line.pricePerUnit * 100) / 100;
}

/** Items and total in the kitchen currency (lines without a price are counted, not summed). */
export function requisitionTotal(lines: readonly ReqLine[], currency: string): { items: number; total: number } {
  const kept = lines.filter((l) => l.qty > 0);
  const total = kept.reduce((s, l) => s + (l.currency === currency ? (lineTotal(l) ?? 0) : 0), 0);
  return { items: kept.length, total: Math.round(total * 100) / 100 };
}

export interface MessageText {
  /** "Requisition · {{kitchen}} kitchen" */
  title: string;
  /** "{{date}} · {{chef}}" */
  subtitle: string;
  /** "Total: {{total}} {{currency}} (Food Bundles prices)" */
  total: string;
  /** "Order or pay: food.rw" */
  footer: string;
}

/**
 * The WhatsApp message (mockup p.12):
 *
 *   Requisition · Food Court kitchen
 *   Thu 19 Nov · Chef
 *
 *   Chicken – 4 kg – 18,000
 *   …
 *
 *   Total: 28,700 RWF (Food Bundles prices)
 *   Order or pay: food.rw
 */
export function whatsappMessage(
  text: MessageText,
  lines: readonly ReqLine[],
  formatQty: (n: number) => string,
  formatAmount: (n: number, currency: string) => string,
): string {
  const body = lines
    .filter((l) => l.qty > 0)
    .map((l) => {
      const total = lineTotal(l);
      const parts = [l.name, `${formatQty(l.qty)} ${l.unit}`];
      if (total !== null && l.currency) parts.push(formatAmount(total, l.currency));
      return parts.join(' – ');
    });
  return [text.title, text.subtitle, '', ...body, '', text.total, text.footer].join('\n');
}

/** The WhatsApp deep link with the message (falls back to wa.me in a browser). */
export function whatsappLinks(message: string): { app: string; web: string } {
  const encoded = encodeURIComponent(message);
  return { app: `whatsapp://send?text=${encoded}`, web: `https://wa.me/?text=${encoded}` };
}
