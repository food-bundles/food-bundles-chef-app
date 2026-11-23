/**
 * Dish recipe costing (Food Bundles UX spec, screen 09; docs/domain-rules.md).
 *
 * - Line cost = recipe qty per portion × FB price per unit (the ingredient's base unit).
 * - Cost per portion = Σ line costs.
 * - Margin = selling price − cost per portion; margin % = margin ÷ selling price.
 *
 * This is a preview while the chef edits; the server's recipe cost stays authoritative.
 * Money is rounded to the currency's minor units (RWF: whole francs) to avoid float noise.
 */

export interface CostLineInput {
  /** Quantity for 1 portion, in the ingredient's base unit. */
  qty: number;
  /** Price per base unit in the dish's currency; null when unknown (or another currency). */
  pricePerUnit: number | null;
}

/** Round to `decimals` places (half away from zero). */
export function roundMoney(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.sign(value) * Math.round(Math.abs(value) * factor + Number.EPSILON) / factor;
}

/** One line's cost, or null when the price is unknown or the quantity is invalid. */
export function lineCost(line: CostLineInput, decimals = 0): number | null {
  if (line.pricePerUnit === null || !Number.isFinite(line.pricePerUnit) || line.pricePerUnit < 0) return null;
  if (!Number.isFinite(line.qty) || line.qty < 0) return null;
  return roundMoney(line.qty * line.pricePerUnit, decimals);
}

export interface PortionCost {
  /** Sum of the lines that have a cost. */
  total: number;
  /** False when at least one line has no price (the total is partial). */
  complete: boolean;
}

/** Cost per portion over all lines. An empty recipe costs 0 and is complete. */
export function costPerPortion(lines: readonly CostLineInput[], decimals = 0): PortionCost {
  let total = 0;
  let complete = true;
  for (const line of lines) {
    const cost = lineCost(line, decimals);
    if (cost === null) complete = false;
    else total += cost;
  }
  return { total: roundMoney(total, decimals), complete };
}

export interface Margin {
  amount: number;
  /** Fraction of the selling price (0.786 = 78.6 %); null when the price is 0 or invalid. */
  fraction: number | null;
}

/** Margin of a dish: selling price − cost per portion. */
export function dishMargin(sellingPrice: number, cost: number, decimals = 0): Margin {
  const amount = roundMoney(sellingPrice - cost, decimals);
  const fraction = Number.isFinite(sellingPrice) && sellingPrice > 0 ? amount / sellingPrice : null;
  return { amount, fraction };
}
