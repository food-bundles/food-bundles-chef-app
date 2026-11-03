export interface OrderTimingInsight {
  productId: string;
  cheaperDay: string;
  cheaperDayAvg: number;
  pricierDay: string;
  pricierDayAvg: number;
}

/** Mock "best day to order" pattern per tracked product, for the price-comparison screen's insight line. */
export const ORDER_TIMING_INSIGHTS: OrderTimingInsight[] = [
  { productId: 'irish-potatoes', cheaperDay: 'Monday', cheaperDayAvg: 8100, pricierDay: 'Friday', pricierDayAvg: 9400 },
  { productId: 'fresh-tomatoes', cheaperDay: 'Tuesday', cheaperDayAvg: 820, pricierDay: 'Saturday', pricierDayAvg: 950 },
  { productId: 'red-onions', cheaperDay: 'Monday', cheaperDayAvg: 520, pricierDay: 'Friday', pricierDayAvg: 590 },
];
