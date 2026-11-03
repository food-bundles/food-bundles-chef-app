import type { CommodityId } from './marketPrices';
import { PRICE_HISTORY } from './marketPrices';

export interface OhlcDay {
  open: number;
  high: number;
  low: number;
  close: number;
}

const MIN_WICK_MARGIN = 3;

/** Derives a deterministic OHLC candle per day from the existing daily close-price history. */
function deriveOhlc(closes: number[]): OhlcDay[] {
  return closes.map((close, index) => {
    const open = index === 0 ? close : closes[index - 1];
    const bodyTop = Math.max(open, close);
    const bodyBottom = Math.min(open, close);
    const spread = Math.max(bodyTop - bodyBottom, 1);
    const high = bodyTop + Math.round(spread * 0.4) + MIN_WICK_MARGIN;
    const low = bodyBottom - Math.round(spread * 0.4) - MIN_WICK_MARGIN;
    const candle = { open, high, low, close };
    if (__DEV__ && (high < bodyTop || low > bodyBottom)) {
      console.warn(`[tradingDashboard] malformed OHLC candle: ${JSON.stringify(candle)}`);
    }
    return candle;
  });
}

export const OHLC_HISTORY: Record<CommodityId, OhlcDay[]> = {
  irishPotatoes: deriveOhlc(PRICE_HISTORY.irishPotatoes),
  tomatoes: deriveOhlc(PRICE_HISTORY.tomatoes),
  redOnions: deriveOhlc(PRICE_HISTORY.redOnions),
  cabbage: deriveOhlc(PRICE_HISTORY.cabbage),
  carrots: deriveOhlc(PRICE_HISTORY.carrots),
};

/** Mock 14-day RSI reading per commodity (0-100 scale). */
export const RSI_VALUES: Record<CommodityId, number> = {
  irishPotatoes: 52,
  tomatoes: 78,
  redOnions: 48,
  cabbage: 28,
  carrots: 55,
};

export type PriceMomentum = 'UP' | 'FLAT' | 'DOWN';

export interface MomentumReading {
  direction: PriceMomentum;
  magnitudePct: number;
}

export const MOMENTUM: Record<CommodityId, MomentumReading> = {
  irishPotatoes: { direction: 'UP', magnitudePct: 3.1 },
  tomatoes: { direction: 'UP', magnitudePct: 13.4 },
  redOnions: { direction: 'DOWN', magnitudePct: 2.8 },
  cabbage: { direction: 'DOWN', magnitudePct: 14.2 },
  carrots: { direction: 'FLAT', magnitudePct: 1.2 },
};

/** Signed percent change for a commodity, derived from its momentum reading (never uniform across commodities). */
export function momentumChangePct(commodityId: CommodityId): number {
  const { direction, magnitudePct } = MOMENTUM[commodityId];
  return direction === 'DOWN' ? -magnitudePct : magnitudePct;
}

/** Restaurant's tracked commodities for the Dashboard watchlist (max 5, seeded with all 5). */
export const WATCHLIST: CommodityId[] = ['irishPotatoes', 'tomatoes', 'redOnions', 'cabbage', 'carrots'];

/** Commodities with the highest absolute price movement today, for "Most active today". */
export const MOST_ACTIVE: CommodityId[] = ['cabbage', 'tomatoes', 'irishPotatoes'];

export type ComparisonPreset = 'WEEK' | 'MONTH' | 'QUARTER';

export const COMPARISON_PRESETS: ComparisonPreset[] = ['WEEK', 'MONTH', 'QUARTER'];

/** Mock comparison-period series: current period vs. the same period one cycle earlier. */
export const COMPARISON_SERIES: Record<ComparisonPreset, { current: number[]; previous: number[] }> = {
  WEEK: { current: [780, 820, 860, 840, 870, 900, 980], previous: [720, 760, 790, 810, 800, 830, 850] },
  MONTH: { current: [760, 810, 862, 890], previous: [700, 740, 780, 810] },
  QUARTER: { current: [730, 810, 862], previous: [680, 750, 790] },
};
