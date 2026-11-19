export interface SalesRecord {
  id: string;
  kitchenId: string;
  menuItemId: string;
  menuItemName: string;
  /** ISO date string YYYY-MM-DD */
  date: string;
  portionsSold: number;
  /** Legacy price field (renamed with the money UI in Step 2a build step 6). */
  priceRwf: number;
  /** ISO 4217 currency of the price, when known. */
  currency?: string;
}
