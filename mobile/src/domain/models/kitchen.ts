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
}
