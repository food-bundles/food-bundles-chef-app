export interface SalesRecord {
  id: string;
  kitchenId: string;
  menuItemId: string;
  menuItemName: string;
  /** ISO date string YYYY-MM-DD */
  date: string;
  portionsSold: number;
  priceRwf: number;
}
