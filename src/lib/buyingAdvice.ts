import type { CommodityId } from '@/mocks/marketPrices';
import { COMMODITIES, PRICE_HISTORY } from '@/mocks/marketPrices';

const BUY_NOW_THRESHOLD = -0.1;
const WAIT_THRESHOLD = 0.08;

/** Maps each tracked commodity to its matching product mock, for photo and cart-add purposes. */
export const COMMODITY_PRODUCT_ID: Record<CommodityId, string> = {
  irishPotatoes: 'irish-potatoes',
  tomatoes: 'fresh-tomatoes',
  redOnions: 'red-onions',
  cabbage: 'cabbage',
  carrots: 'carrots',
};

export interface BuyingAdviceItem {
  commodityId: CommodityId;
  name: string;
  unit: string;
  todayPrice: number;
  weeklyAveragePrice: number;
  changeFraction: number;
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Splits commodities into "buy now" (well below their 7-day average) and "wait" (well above it). */
export function computeBuyingAdvice(): { buyNow: BuyingAdviceItem[]; wait: BuyingAdviceItem[] } {
  const items = COMMODITIES.map((commodity): BuyingAdviceItem => {
    const history = PRICE_HISTORY[commodity.id];
    const todayPrice = history[history.length - 1];
    const weeklyAveragePrice = average(history);
    return {
      commodityId: commodity.id,
      name: commodity.name,
      unit: commodity.unit,
      todayPrice,
      weeklyAveragePrice,
      changeFraction: (todayPrice - weeklyAveragePrice) / weeklyAveragePrice,
    };
  });

  return {
    buyNow: items.filter((item) => item.changeFraction <= BUY_NOW_THRESHOLD),
    wait: items.filter((item) => item.changeFraction >= WAIT_THRESHOLD),
  };
}
