/**
 * Deterministic calculation utilities for expected ingredient use.
 * These functions must never be delegated to an LLM.
 * All arithmetic uses explicit rounding to avoid floating-point drift.
 */

/** Weeks of sales history for weighted average */
export interface WeeklySales {
  /** Most recent complete week */
  week0: number;
  week1: number;
  week2: number;
  week3: number;
}

const SAFETY_BUFFER = 0.1; // 10%
const WEEKS = { W0: 0.4, W1: 0.2, W2: 0.2, W3: 0.2 } as const;

/**
 * Calculates the expected number of portions to prepare using a
 * four-week weighted moving average with a 10% safety buffer.
 *
 * @param sales - Four weeks of portion sales, most recent first.
 *                Missing weeks (undefined) are treated as zero.
 * @returns Expected portions including safety buffer, rounded up.
 */
export function calcExpectedPortions(sales: Partial<WeeklySales>): number {
  const w0 = sales.week0 ?? 0;
  const w1 = sales.week1 ?? 0;
  const w2 = sales.week2 ?? 0;
  const w3 = sales.week3 ?? 0;

  const weighted = w0 * WEEKS.W0 + w1 * WEEKS.W1 + w2 * WEEKS.W2 + w3 * WEEKS.W3;
  return Math.ceil(weighted * (1 + SAFETY_BUFFER));
}

/**
 * Calculates expected daily ingredient use for one ingredient in one menu item.
 *
 * Formula: (weeklySales / daysOpen) × quantityPerPortion ÷ yieldPercentage
 *
 * @param weeklySales - Total portions sold per week
 * @param daysOpen - Number of days the kitchen operates per week (1–7)
 * @param quantityPerPortion - Amount of ingredient used per portion (in stock unit)
 * @param yieldPercentage - Fraction retained after prep, e.g. 0.85 for 85% yield.
 *                          Must be > 0. If undefined, defaults to 1.0 (no waste).
 * @returns Expected daily ingredient use in the ingredient's stock unit
 * @throws if daysOpen ≤ 0 or yieldPercentage ≤ 0
 */
export function calcExpectedDailyUse(
  weeklySales: number,
  daysOpen: number,
  quantityPerPortion: number,
  yieldPercentage = 1.0,
): number {
  if (daysOpen <= 0) {
    throw new RangeError(`daysOpen must be > 0, got ${daysOpen}`);
  }
  if (yieldPercentage <= 0) {
    throw new RangeError(`yieldPercentage must be > 0, got ${yieldPercentage}`);
  }
  if (weeklySales < 0 || quantityPerPortion < 0) {
    return 0;
  }
  const dailySales = weeklySales / daysOpen;
  return (dailySales * quantityPerPortion) / yieldPercentage;
}

/**
 * Calculates days of stock cover for one ingredient.
 * Returns Infinity when expectedDailyUse is 0 (no consumption expected).
 *
 * @param currentStock - Available stock in the ingredient's stock unit
 * @param expectedDailyUse - From calcExpectedDailyUse
 */
export function calcDaysOfCover(currentStock: number, expectedDailyUse: number): number {
  if (expectedDailyUse <= 0) return Infinity;
  return currentStock / expectedDailyUse;
}

/**
 * Returns true when days of cover is below 1.0 (low stock threshold).
 */
export function isLowStock(currentStock: number, expectedDailyUse: number): boolean {
  return calcDaysOfCover(currentStock, expectedDailyUse) < 1.0;
}
