/**
 * Deterministic purchasing calculation utilities.
 * All arithmetic is pure TypeScript — no LLM involvement.
 */

/**
 * Calculates the quantity to buy for one ingredient.
 *
 * Formula: max(0, expectedRequirement - availableStock)
 * Rounded up to the nearest whole purchase unit.
 *
 * @param expectedRequirement - Total ingredient needed (stock unit)
 * @param availableStock - Current stock on hand (stock unit)
 * @param purchaseUnitSize - How many stock units per purchase unit (e.g. 1 crate = 25 kg → 25)
 * @returns Whole number of purchase units to order
 */
export function calcQuantityToBuy(
  expectedRequirement: number,
  availableStock: number,
  purchaseUnitSize = 1,
): number {
  if (purchaseUnitSize <= 0) {
    throw new RangeError(`purchaseUnitSize must be > 0, got ${purchaseUnitSize}`);
  }
  const net = expectedRequirement - availableStock;
  if (net <= 0) return 0;
  return Math.ceil(net / purchaseUnitSize);
}

/**
 * Checks whether a delivery is short.
 * A delivery is short when the accepted quantity is more than 5% below the ordered quantity.
 *
 * @param orderedQuantity - Quantity originally ordered
 * @param acceptedQuantity - Quantity accepted after receiving inspection
 * @returns true if short delivery
 */
export function isShortDelivery(orderedQuantity: number, acceptedQuantity: number): boolean {
  if (orderedQuantity <= 0) return false;
  const shortfall = orderedQuantity - acceptedQuantity;
  return shortfall / orderedQuantity > 0.05;
}

/**
 * Calculates the shortfall percentage for a delivery item.
 *
 * @returns Fraction of ordered quantity that was not delivered (0–1), or 0 if none.
 */
export function calcShortfallFraction(orderedQuantity: number, acceptedQuantity: number): number {
  if (orderedQuantity <= 0) return 0;
  return Math.max(0, (orderedQuantity - acceptedQuantity) / orderedQuantity);
}
