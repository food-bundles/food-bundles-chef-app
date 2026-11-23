/**
 * Today's stock (spec screen 10; docs/domain-rules.md). The server computes the table; these
 * pure helpers preview a count and pick the LEFT colour.
 *
 * stockLeft = start + in − used + counted (counted = the count's difference).
 * Amber when left < lowFactor × one service's average use; red below veryLowFactor × it.
 */

export type StockLevel = 'ok' | 'low' | 'very_low';

/** Start + In − Used + Counted. */
export function stockLeft(start: number, received: number, used: number, counted = 0): number {
  return Math.round((start + received - used + counted) * 1000) / 1000;
}

/** The LEFT colour: very low (red), low (amber) or ok. No history → ok. */
export function stockLevel(left: number, avgServiceUse: number | null, lowFactor = 1, veryLowFactor = 0.5): StockLevel {
  if (avgServiceUse === null || !(avgServiceUse > 0)) return 'ok';
  if (left < avgServiceUse * veryLowFactor) return 'very_low';
  if (left < avgServiceUse * lowFactor) return 'low';
  return 'ok';
}

/** The adjustment a count saves: counted − left (negative = less than expected). */
export function countDifference(left: number, counted: number): number {
  return Math.round((counted - left) * 1000) / 1000;
}
