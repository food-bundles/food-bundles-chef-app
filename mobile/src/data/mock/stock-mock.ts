import type { StockItem } from '@/domain/models/stock-item';

export const MOCK_STOCK: StockItem[] = [
  { id: 'st-1', kitchenId: 'kitchen-1', ingredientId: 'ing-1', ingredientName: 'Tomatoes', unit: 'kg', quantityOnHand: 4, dailyUseRate: 8, lastUpdated: '2025-10-29T18:00:00Z' },
  { id: 'st-2', kitchenId: 'kitchen-1', ingredientId: 'ing-2', ingredientName: 'Onions', unit: 'kg', quantityOnHand: 6, dailyUseRate: 7.5, lastUpdated: '2025-10-29T18:00:00Z' },
  { id: 'st-3', kitchenId: 'kitchen-1', ingredientId: 'ing-3', ingredientName: 'Cooking Oil', unit: 'L', quantityOnHand: 2, dailyUseRate: 2.2, lastUpdated: '2025-10-29T18:00:00Z' },
  { id: 'st-4', kitchenId: 'kitchen-1', ingredientId: 'ing-4', ingredientName: 'Cassava Leaves', unit: 'kg', quantityOnHand: 15, dailyUseRate: 4, lastUpdated: '2025-10-29T18:00:00Z' },
  { id: 'st-5', kitchenId: 'kitchen-1', ingredientId: 'ing-5', ingredientName: 'Maize Flour', unit: 'kg', quantityOnHand: 25, dailyUseRate: 5, lastUpdated: '2025-10-29T18:00:00Z' },
  { id: 'st-6', kitchenId: 'kitchen-1', ingredientId: 'ing-6', ingredientName: 'Beef', unit: 'kg', quantityOnHand: 10, dailyUseRate: 3, lastUpdated: '2025-10-29T18:00:00Z' },
  { id: 'st-7', kitchenId: 'kitchen-1', ingredientId: 'ing-7', ingredientName: 'Salt', unit: 'kg', quantityOnHand: 8, dailyUseRate: 0.2, lastUpdated: '2025-10-29T18:00:00Z' },
  // kitchen-2
  { id: 'st-8', kitchenId: 'kitchen-2', ingredientId: 'ing-1', ingredientName: 'Tomatoes', unit: 'kg', quantityOnHand: 12, dailyUseRate: 3, lastUpdated: '2025-10-29T18:00:00Z' },
  { id: 'st-9', kitchenId: 'kitchen-2', ingredientId: 'ing-8', ingredientName: 'Beans', unit: 'kg', quantityOnHand: 20, dailyUseRate: 4, lastUpdated: '2025-10-29T18:00:00Z' },
];
