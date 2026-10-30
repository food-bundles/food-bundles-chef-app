import type { Order } from '@/domain/models/order';

export const MOCK_ORDERS: Order[] = [
  {
    id: 'ord-1',
    kitchenId: 'kitchen-1',
    status: 'delivered',
    lineItems: [
      { productId: 'cat-1', productName: 'Tomatoes', unit: 'kg', quantity: 20, unitPriceRwf: 800 },
      { productId: 'cat-2', productName: 'Onions', unit: 'kg', quantity: 25, unitPriceRwf: 600 },
    ],
    totalRwf: 31000,
    placedAt: '2025-10-27T09:00:00Z',
    expectedDeliveryAt: '2025-10-28T07:00:00Z',
    createdAt: '2025-10-27T09:00:00Z',
  },
  {
    id: 'ord-2',
    kitchenId: 'kitchen-1',
    status: 'confirmed',
    lineItems: [
      { productId: 'cat-3', productName: 'Cooking Oil', unit: 'L', quantity: 20, unitPriceRwf: 2200 },
      { productId: 'cat-5', productName: 'Maize Flour', unit: 'kg', quantity: 50, unitPriceRwf: 650 },
    ],
    totalRwf: 76500,
    placedAt: '2025-10-29T10:00:00Z',
    expectedDeliveryAt: '2025-10-30T07:00:00Z',
    createdAt: '2025-10-29T10:00:00Z',
  },
];
