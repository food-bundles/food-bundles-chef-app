/**
 * Represents a kitchen owned by a chef.
 * Every operational record carries a kitchenId for isolation.
 */
export interface Kitchen {
  id: string;
  chefId: string;
  name: string;
  address?: string;
  cuisineType?: string;
  seatingCapacity?: number;
  isArchived: boolean;
  createdAt: string;
  /** ISO 4217 currency the kitchen prices in. */
  currency: string;
  /** IANA time zone: the kitchen's "today". */
  timezone: string;
  /** ISO 3166-1 alpha-2, or null if not set. */
  country: string | null;
  /** Food Bundles catalogue is offered (only in countries Food Bundles serves). */
  catalogAvailable: boolean;
  /**
   * Currency conversion is offered (convert mode, costs in other currencies, rates shown).
   * Off outside the enabled countries until a licensed rate source is confirmed.
   */
  conversionEnabled: boolean;
  /** Service hours, "HH:MM" in the kitchen's time zone (Home's state; default 11:00–22:00). */
  openingTime: string;
  closingTime: string;
}
