import type { DailySalesSummaryDto } from '@/api/sales-api';
import { formatMoney } from '@/lib/money';

/**
 * Today's revenue for the dashboard: one amount per currency joined with " + ", never a
 * sum across currencies (e.g. after the kitchen changed currency during the day).
 * Older servers without per-currency subtotals: the single `revenue` in `currency`.
 */
export function formatSalesTotal(
  summary: DailySalesSummaryDto | undefined,
  kitchenCurrency: string,
  lang?: string,
): string {
  if (!summary) return formatMoney(0, kitchenCurrency, lang);
  const parts = summary.revenue_by_currency ?? [];
  if (parts.length === 0) return formatMoney(summary.revenue, summary.currency, lang);
  return parts.map((m) => formatMoney(m.amount, m.currency, lang)).join(' + ');
}
