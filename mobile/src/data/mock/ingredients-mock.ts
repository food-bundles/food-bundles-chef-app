import type { Ingredient } from '@/domain/models/ingredient';

export const MOCK_INGREDIENTS: Ingredient[] = [
  { id: 'ing-1', kitchenId: 'kitchen-1', name: 'Tomatoes', unit: 'kg', category: 'Vegetables' },
  { id: 'ing-2', kitchenId: 'kitchen-1', name: 'Onions', unit: 'kg', category: 'Vegetables' },
  { id: 'ing-3', kitchenId: 'kitchen-1', name: 'Cooking Oil', unit: 'L', category: 'Oils & Fats' },
  { id: 'ing-4', kitchenId: 'kitchen-1', name: 'Cassava Leaves', unit: 'kg', category: 'Vegetables' },
  { id: 'ing-5', kitchenId: 'kitchen-1', name: 'Maize Flour', unit: 'kg', category: 'Grains & Flours' },
  { id: 'ing-6', kitchenId: 'kitchen-1', name: 'Beef', unit: 'kg', category: 'Meat & Fish' },
  { id: 'ing-7', kitchenId: 'kitchen-1', name: 'Salt', unit: 'kg', category: 'Spices & Condiments' },
  { id: 'ing-8', kitchenId: 'kitchen-1', name: 'Beans', unit: 'kg', category: 'Legumes' },
  { id: 'ing-9', kitchenId: 'kitchen-1', name: 'Palm Oil', unit: 'L', category: 'Oils & Fats' },
  { id: 'ing-10', kitchenId: 'kitchen-1', name: 'Garlic', unit: 'kg', category: 'Spices & Condiments' },
  // kitchen-2
  { id: 'ing-11', kitchenId: 'kitchen-2', name: 'Tomatoes', unit: 'kg', category: 'Vegetables' },
  { id: 'ing-12', kitchenId: 'kitchen-2', name: 'Beans', unit: 'kg', category: 'Legumes' },
  { id: 'ing-13', kitchenId: 'kitchen-2', name: 'Green Bananas', unit: 'kg', category: 'Fruits' },
];
