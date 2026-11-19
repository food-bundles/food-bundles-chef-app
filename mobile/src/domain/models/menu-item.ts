export interface MenuItem {
  id: string;
  kitchenId: string;
  name: string;
  description?: string;
  category: string;
  /** Selling price in `currency` (decimal major units). */
  price: number;
  /** ISO 4217. */
  currency: string;
  isActive: boolean;
  createdAt: string;
}
