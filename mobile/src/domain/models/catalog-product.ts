export interface CatalogProduct {
  id: string;
  name: string;
  category: string;
  unit: string;
  packSize: number;
  unitPriceRwf: number;
  inStock: boolean;
  sku?: string;
  description?: string;
}
