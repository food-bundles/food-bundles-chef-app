import type { Order } from '@/mocks/types';
import { MARKET_COMPARISON } from '@/mocks/marketPrices';

export type PriceHistoryRange = 'WEEK' | 'MONTH' | 'QUARTER';

const RANGE_DAYS: Record<PriceHistoryRange, number> = { WEEK: 7, MONTH: 30, QUARTER: 90 };

/** Filters orders to those placed within the selected range, measured back from the latest order. */
export function filterOrdersByRange(orders: Order[], range: PriceHistoryRange): Order[] {
  if (orders.length === 0) return orders;
  const latest = Math.max(...orders.map((order) => new Date(order.placedAt).getTime()));
  const cutoff = latest - RANGE_DAYS[range] * 24 * 60 * 60 * 1000;
  return orders.filter((order) => new Date(order.placedAt).getTime() >= cutoff);
}

export interface OrderPricePoint {
  orderId: string;
  placedAt: string;
  pricePerUnit: number;
}

export interface ItemComparison {
  productId: string;
  name: string;
  points: OrderPricePoint[];
  avgPaid: number;
  vsMarketPct: Record<string, number>;
}

const BENCHMARK_MARKET = 'FoodBundles';

/**
 * Builds, per product, every order the restaurant placed for it (with the price paid at
 * order time) plus how that average compares to each tracked market's multiplier-derived price.
 */
export function computeItemComparisons(orders: Order[]): ItemComparison[] {
  const byProduct = new Map<string, ItemComparison>();

  for (const order of orders) {
    for (const line of order.lines) {
      if (line.pricePerUnitAtOrderTime === undefined) continue;
      const existing = byProduct.get(line.productId);
      const point: OrderPricePoint = {
        orderId: order.id,
        placedAt: order.placedAt,
        pricePerUnit: line.pricePerUnitAtOrderTime,
      };
      if (existing) {
        existing.points.push(point);
      } else {
        byProduct.set(line.productId, {
          productId: line.productId,
          name: line.name,
          points: [point],
          avgPaid: 0,
          vsMarketPct: {},
        });
      }
    }
  }

  return Array.from(byProduct.values())
    .map((item) => {
      const avgPaid = item.points.reduce((sum, p) => sum + p.pricePerUnit, 0) / item.points.length;
      const foodBundles = MARKET_COMPARISON.find((m) => m.market === BENCHMARK_MARKET);
      const vsMarketPct: Record<string, number> = {};
      for (const row of MARKET_COMPARISON) {
        if (row.market === BENCHMARK_MARKET) continue;
        const benchmarkPrice = avgPaid / (foodBundles?.priceMultiplier ?? 1);
        const marketPrice = benchmarkPrice * row.priceMultiplier;
        vsMarketPct[row.market] = ((avgPaid - marketPrice) / marketPrice) * 100;
      }
      return { ...item, avgPaid, vsMarketPct };
    })
    .sort((a, b) => b.avgPaid * b.points.length - a.avgPaid * a.points.length);
}

export interface ComparisonSummary {
  avgVsBenchmarkPct: number;
  savedVsKimironkoRwf: number;
}

/** Rolls every item comparison into one top-line summary: avg % vs. FoodBundles, and RWF saved vs. Kimironko. */
export function computeComparisonSummary(items: ItemComparison[]): ComparisonSummary {
  if (items.length === 0) return { avgVsBenchmarkPct: 0, savedVsKimironkoRwf: 0 };

  const avgVsBenchmarkPct = items.reduce((sum, item) => sum + (item.vsMarketPct.Kimironko ?? 0), 0) / items.length;

  const savedVsKimironkoRwf = items.reduce((sum, item) => {
    const kimironkoPct = item.vsMarketPct.Kimironko ?? 0;
    const kimironkoPrice = item.avgPaid / (1 + kimironkoPct / 100);
    const totalQty = item.points.length;
    return sum + (kimironkoPrice - item.avgPaid) * totalQty;
  }, 0);

  return { avgVsBenchmarkPct, savedVsKimironkoRwf };
}
