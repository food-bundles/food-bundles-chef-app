export interface MenuItem {
  id: string;
  kitchenId: string;
  name: string;
  description?: string;
  category: string;
  priceRwf: number;
  isActive: boolean;
  createdAt: string;
}
