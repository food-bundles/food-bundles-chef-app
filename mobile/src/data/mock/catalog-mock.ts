import type { CatalogProduct } from '@/domain/models/catalog-product';

/** Food Bundles supplier catalog (mock — no live API) */
export const MOCK_CATALOG: CatalogProduct[] = [
  { id: 'cat-1', name: 'Tomatoes', category: 'Vegetables', unit: 'kg', packSize: 10, unitPriceRwf: 800, inStock: true, sku: 'FB-VEG-001' },
  { id: 'cat-2', name: 'Onions', category: 'Vegetables', unit: 'kg', packSize: 25, unitPriceRwf: 600, inStock: true, sku: 'FB-VEG-002' },
  { id: 'cat-3', name: 'Cooking Oil', category: 'Oils & Fats', unit: 'L', packSize: 20, unitPriceRwf: 2200, inStock: true, sku: 'FB-OIL-001' },
  { id: 'cat-4', name: 'Cassava Leaves', category: 'Vegetables', unit: 'kg', packSize: 5, unitPriceRwf: 500, inStock: true, sku: 'FB-VEG-003' },
  { id: 'cat-5', name: 'Maize Flour', category: 'Grains & Flours', unit: 'kg', packSize: 50, unitPriceRwf: 650, inStock: true, sku: 'FB-GRN-001' },
  { id: 'cat-6', name: 'Beef (Boneless)', category: 'Meat & Fish', unit: 'kg', packSize: 10, unitPriceRwf: 9500, inStock: true, sku: 'FB-MET-001' },
  { id: 'cat-7', name: 'Beans (Dry)', category: 'Legumes', unit: 'kg', packSize: 25, unitPriceRwf: 700, inStock: true, sku: 'FB-LEG-001' },
  { id: 'cat-8', name: 'Palm Oil', category: 'Oils & Fats', unit: 'L', packSize: 20, unitPriceRwf: 1800, inStock: false, sku: 'FB-OIL-002' },
  { id: 'cat-9', name: 'Salt (Iodized)', category: 'Spices & Condiments', unit: 'kg', packSize: 50, unitPriceRwf: 300, inStock: true, sku: 'FB-SPC-001' },
  { id: 'cat-10', name: 'Garlic', category: 'Spices & Condiments', unit: 'kg', packSize: 5, unitPriceRwf: 3500, inStock: true, sku: 'FB-SPC-002' },
  { id: 'cat-11', name: 'Green Bananas (Matoke)', category: 'Fruits', unit: 'kg', packSize: 20, unitPriceRwf: 450, inStock: true, sku: 'FB-FRT-001' },
  { id: 'cat-12', name: 'Passion Fruit', category: 'Fruits', unit: 'kg', packSize: 5, unitPriceRwf: 2000, inStock: true, sku: 'FB-FRT-002' },
];
