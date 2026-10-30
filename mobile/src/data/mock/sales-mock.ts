import type { SalesRecord } from '@/domain/models/sales-record';

/** Last 4 weeks of sales for kitchen-1 menu items */
export const MOCK_SALES: SalesRecord[] = [
  // Week 1 (oldest)
  { id: 's-w1-1', kitchenId: 'kitchen-1', menuItemId: 'mi-1', menuItemName: 'Isombe', date: '2025-10-05', portionsSold: 28, priceRwf: 2500 },
  { id: 's-w1-2', kitchenId: 'kitchen-1', menuItemId: 'mi-2', menuItemName: 'Brochettes de Boeuf', date: '2025-10-05', portionsSold: 18, priceRwf: 4500 },
  { id: 's-w1-3', kitchenId: 'kitchen-1', menuItemId: 'mi-3', menuItemName: 'Ugali', date: '2025-10-05', portionsSold: 45, priceRwf: 800 },
  // Week 2
  { id: 's-w2-1', kitchenId: 'kitchen-1', menuItemId: 'mi-1', menuItemName: 'Isombe', date: '2025-10-12', portionsSold: 32, priceRwf: 2500 },
  { id: 's-w2-2', kitchenId: 'kitchen-1', menuItemId: 'mi-2', menuItemName: 'Brochettes de Boeuf', date: '2025-10-12', portionsSold: 22, priceRwf: 4500 },
  { id: 's-w2-3', kitchenId: 'kitchen-1', menuItemId: 'mi-3', menuItemName: 'Ugali', date: '2025-10-12', portionsSold: 50, priceRwf: 800 },
  // Week 3
  { id: 's-w3-1', kitchenId: 'kitchen-1', menuItemId: 'mi-1', menuItemName: 'Isombe', date: '2025-10-19', portionsSold: 30, priceRwf: 2500 },
  { id: 's-w3-2', kitchenId: 'kitchen-1', menuItemId: 'mi-2', menuItemName: 'Brochettes de Boeuf', date: '2025-10-19', portionsSold: 25, priceRwf: 4500 },
  { id: 's-w3-3', kitchenId: 'kitchen-1', menuItemId: 'mi-3', menuItemName: 'Ugali', date: '2025-10-19', portionsSold: 48, priceRwf: 800 },
  // Week 4 (most recent)
  { id: 's-w4-1', kitchenId: 'kitchen-1', menuItemId: 'mi-1', menuItemName: 'Isombe', date: '2025-10-26', portionsSold: 35, priceRwf: 2500 },
  { id: 's-w4-2', kitchenId: 'kitchen-1', menuItemId: 'mi-2', menuItemName: 'Brochettes de Boeuf', date: '2025-10-26', portionsSold: 20, priceRwf: 4500 },
  { id: 's-w4-3', kitchenId: 'kitchen-1', menuItemId: 'mi-3', menuItemName: 'Ugali', date: '2025-10-26', portionsSold: 52, priceRwf: 800 },
];
