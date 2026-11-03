import type { ItemComparison } from './priceComparison';

/** Builds a CSV string of the price-comparison breakdown, one row per order per item. */
export function buildComparisonCsv(items: ItemComparison[]): string {
  const header = 'Item,Order,Date,Price paid (RWF/kg)';
  const rows = items.flatMap((item) =>
    item.points.map((point) => `${item.name},${point.orderId},${point.placedAt.slice(0, 10)},${point.pricePerUnit}`),
  );
  return [header, ...rows].join('\n');
}
