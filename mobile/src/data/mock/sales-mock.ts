import type { SalesRecord } from '@/domain/models/sales-record';

/** Last 4 weeks of sales for kitchen-1 menu items */
export const MOCK_SALES: SalesRecord[] = [
  // Week 1 (oldest)
  { id: 's-w1-1', kitchenId: 'kitchen-1', menuItemId: 'mi-1', menuItemName: 'Isombe', date: '2025-10-05', portionsSold: 28, price: 2500, currency: 'RWF' },
  { id: 's-w1-2', kitchenId: 'kitchen-1', menuItemId: 'mi-2', menuItemName: 'Brochettes de Boeuf', date: '2025-10-05', portionsSold: 18, price: 4500, currency: 'RWF' },
  { id: 's-w1-3', kitchenId: 'kitchen-1', menuItemId: 'mi-3', menuItemName: 'Ugali', date: '2025-10-05', portionsSold: 45, price: 800, currency: 'RWF' },
  // Week 2
  { id: 's-w2-1', kitchenId: 'kitchen-1', menuItemId: 'mi-1', menuItemName: 'Isombe', date: '2025-10-12', portionsSold: 32, price: 2500, currency: 'RWF' },
  { id: 's-w2-2', kitchenId: 'kitchen-1', menuItemId: 'mi-2', menuItemName: 'Brochettes de Boeuf', date: '2025-10-12', portionsSold: 22, price: 4500, currency: 'RWF' },
  { id: 's-w2-3', kitchenId: 'kitchen-1', menuItemId: 'mi-3', menuItemName: 'Ugali', date: '2025-10-12', portionsSold: 50, price: 800, currency: 'RWF' },
  // Week 3
  { id: 's-w3-1', kitchenId: 'kitchen-1', menuItemId: 'mi-1', menuItemName: 'Isombe', date: '2025-10-19', portionsSold: 30, price: 2500, currency: 'RWF' },
  { id: 's-w3-2', kitchenId: 'kitchen-1', menuItemId: 'mi-2', menuItemName: 'Brochettes de Boeuf', date: '2025-10-19', portionsSold: 25, price: 4500, currency: 'RWF' },
  { id: 's-w3-3', kitchenId: 'kitchen-1', menuItemId: 'mi-3', menuItemName: 'Ugali', date: '2025-10-19', portionsSold: 48, price: 800, currency: 'RWF' },
  // Week 4 (most recent)
  { id: 's-w4-1', kitchenId: 'kitchen-1', menuItemId: 'mi-1', menuItemName: 'Isombe', date: '2025-10-26', portionsSold: 35, price: 2500, currency: 'RWF' },
  { id: 's-w4-2', kitchenId: 'kitchen-1', menuItemId: 'mi-2', menuItemName: 'Brochettes de Boeuf', date: '2025-10-26', portionsSold: 20, price: 4500, currency: 'RWF' },
  { id: 's-w4-3', kitchenId: 'kitchen-1', menuItemId: 'mi-3', menuItemName: 'Ugali', date: '2025-10-26', portionsSold: 52, price: 800, currency: 'RWF' },
];
