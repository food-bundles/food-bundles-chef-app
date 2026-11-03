export type CommodityId = 'irishPotatoes' | 'tomatoes' | 'redOnions' | 'cabbage' | 'carrots';

export interface CommodityInfo {
  id: CommodityId;
  name: string;
  unit: string;
}

export const COMMODITIES: CommodityInfo[] = [
  { id: 'irishPotatoes', name: 'Irish Potatoes', unit: 'kg' },
  { id: 'tomatoes', name: 'Tomatoes', unit: 'kg' },
  { id: 'redOnions', name: 'Red Onions', unit: 'kg' },
  { id: 'cabbage', name: 'Cabbage', unit: 'kg' },
  { id: 'carrots', name: 'Carrots', unit: 'kg' },
];

/** Seven trailing daily prices (RWF/kg), Monday through Sunday, at FoodBundles' own market. */
export const PRICE_HISTORY: Record<CommodityId, number[]> = {
  irishPotatoes: [360, 355, 370, 380, 375, 390, 385],
  tomatoes: [780, 820, 860, 840, 870, 900, 980],
  redOnions: [520, 530, 545, 560, 555, 570, 565],
  cabbage: [310, 320, 330, 325, 340, 350, 275],
  carrots: [400, 410, 405, 415, 420, 430, 425],
};

export type TimeRange = '1D' | '7D' | '1M' | '3M';

export const TIME_RANGES: TimeRange[] = ['1D', '7D', '1M', '3M'];

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEK_LABELS = ['W1', 'W2', 'W3', 'W4'];
const MONTH_LABELS = ['Jun', 'Jul', 'Aug'];

/** Monthly RWF/kg averages for the 1M/3M views — same commodities, coarser grain. */
const MONTHLY_HISTORY: Record<CommodityId, number[]> = {
  irishPotatoes: [340, 365, 378],
  tomatoes: [760, 810, 862],
  redOnions: [505, 535, 558],
  cabbage: [300, 322, 338],
  carrots: [390, 408, 419],
};

const WEEKLY_HISTORY: Record<CommodityId, number[]> = {
  irishPotatoes: [352, 368, 371, 385],
  tomatoes: [795, 830, 855, 883],
  redOnions: [515, 528, 548, 566],
  cabbage: [308, 318, 332, 346],
  carrots: [398, 407, 417, 427],
};

export interface TimeRangeSeries {
  values: number[];
  labels: string[];
}

/** Resolves the price series + axis labels for a commodity at a given time range. */
export function getPriceSeries(commodity: CommodityId, range: TimeRange): TimeRangeSeries {
  if (range === '1D') {
    const latest = PRICE_HISTORY[commodity][PRICE_HISTORY[commodity].length - 1];
    return { values: [latest, latest], labels: ['12 AM', 'Now'] };
  }
  if (range === '7D') return { values: PRICE_HISTORY[commodity], labels: DAY_LABELS };
  if (range === '1M') return { values: WEEKLY_HISTORY[commodity], labels: WEEK_LABELS };
  return { values: MONTHLY_HISTORY[commodity], labels: MONTH_LABELS };
}

export interface MarketComparisonRow {
  market: string;
  /** Multiplier applied to FoodBundles' latest price to derive this market's price. */
  priceMultiplier: number;
  stock: 'HIGH' | 'MEDIUM' | 'LOW';
  /** Last 5 days of price movement, relative units, for a mini sparkline. */
  trend: number[];
  isFoodBundles?: boolean;
}

export const MARKET_COMPARISON: MarketComparisonRow[] = [
  { market: 'Kimironko', priceMultiplier: 1.08, stock: 'MEDIUM', trend: [3, 4, 4, 5, 5] },
  { market: 'Nyabugogo', priceMultiplier: 1.12, stock: 'LOW', trend: [4, 4, 5, 5, 6] },
  { market: 'Musanze', priceMultiplier: 0.96, stock: 'HIGH', trend: [3, 3, 2, 3, 3] },
  { market: 'FoodBundles', priceMultiplier: 1, stock: 'HIGH', trend: [3, 3, 3, 4, 3], isFoodBundles: true },
];

/** Order volume (units) for the last 7 days, used by the "Volume trend" analytics card. */
export const VOLUME_TREND: Record<CommodityId, number[]> = {
  irishPotatoes: [42, 38, 45, 50, 47, 60, 55],
  tomatoes: [30, 34, 28, 32, 36, 40, 38],
  redOnions: [25, 22, 27, 29, 26, 31, 30],
  cabbage: [18, 20, 19, 22, 21, 24, 23],
  carrots: [20, 21, 23, 22, 25, 27, 24],
};
