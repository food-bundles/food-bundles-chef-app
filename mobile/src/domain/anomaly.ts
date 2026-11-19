/** A price and its ISO 4217 currency. */
export interface PricePoint {
  amount: number;
  currency: string;
}

/**
 * Shared price anomaly check (Step 2a, section 2e): compares only peers in the SAME
 * currency (a USD price is never measured against RWF prices). Needs at least 2 such peers
 * (3 prices in all); flags a price above 5× or below 0.2× their median.
 * Returns 'high' | 'low' | false. Never blocking — callers show a soft warning.
 */
export function detectAnomaly(value: PricePoint, peers: readonly PricePoint[]): 'high' | 'low' | false {
  const currency = value.currency.toUpperCase();
  const same = peers.filter((p) => p.currency.toUpperCase() === currency && p.amount > 0).map((p) => p.amount);
  if (same.length < 2 || value.amount <= 0) return false;
  const sorted = [...same, value.amount].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 1 ? (sorted[mid] ?? 0) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  if (median === 0) return false;
  if (value.amount > median * 5) return 'high';
  if (value.amount < median * 0.2) return 'low';
  return false;
}
