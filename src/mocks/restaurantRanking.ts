export interface PeerIngredientCost {
  productId: string;
  yourCost: number;
  peerAvgCost: number;
}

/** A deterministic peer distribution of monthly purchase volumes (RWF) across 90 anonymous Kigali restaurants. */
export const PEER_MONTHLY_VOLUMES: number[] = Array.from({ length: 90 }, (_, index) => {
  const base = 380_000 + index * 9_400;
  const wobble = ((index * 37) % 5) * 6_200;
  return base + wobble;
});

export const YOUR_MONTHLY_VOLUME = 810_000;
export const PEER_AVG_ORDER_SIZE = 58_200;
export const YOUR_AVG_ORDER_SIZE = 71_400;

export const YOUR_LOCATION = 'Kimihurura';
export const MARKETS_WITHIN_REACH = 4;
export const TOTAL_MARKETS_TRACKED = 5;

export interface NearbyMarketPrice {
  marketName: string;
  productId: string;
  price: number;
}

export const NEARBY_MARKET_PRICES: NearbyMarketPrice[] = [
  { marketName: 'Kimironko', productId: 'irish-potatoes', price: 13200 },
  { marketName: 'Nyabugogo', productId: 'irish-potatoes', price: 12900 },
  { marketName: 'Kimironko', productId: 'fresh-tomatoes', price: 8900 },
  { marketName: 'Nyabugogo', productId: 'fresh-tomatoes', price: 8600 },
  { marketName: 'Kimironko', productId: 'red-onions', price: 10100 },
];

export const YOUR_COST_PER_COVER = 4200;
export const PEER_MEDIAN_COST_PER_COVER = 5800;

/** Seven trailing weekly cost-per-cover values (RWF), showing the efficiency trend. */
export const COST_PER_COVER_TREND: number[] = [5100, 4950, 4800, 4600, 4450, 4300, 4200];

export const MENU_MARKUP_MULTIPLIER = 3;

export const PEER_INGREDIENT_COSTS: PeerIngredientCost[] = [
  { productId: 'irish-potatoes', yourCost: 12500, peerAvgCost: 13100 },
  { productId: 'fresh-tomatoes', yourCost: 8200, peerAvgCost: 8900 },
  { productId: 'red-onions', yourCost: 9600, peerAvgCost: 10200 },
  { productId: 'carrots', yourCost: 5400, peerAvgCost: 5900 },
  { productId: 'cabbage', yourCost: 3800, peerAvgCost: 4100 },
];
