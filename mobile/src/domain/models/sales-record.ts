export interface SalesRecord {
  id: string;
  kitchenId: string;
  menuItemId: string;
  menuItemName: string;
  /** ISO date string YYYY-MM-DD */
  date: string;
  portionsSold: number;
  /** Price at sale time, in `currency` (stored in the legacy price_rwf column). */
  price: number;
  /** ISO 4217 currency of the price, when known. */
  currency?: string;
}
