export interface StockItem {
  id: string;
  kitchenId: string;
  ingredientId: string;
  ingredientName: string;
  unit: string;
  quantityOnHand: number;
  /** Daily usage rate derived from sales calculations */
  dailyUseRate: number;
  lastUpdated: string;
}
