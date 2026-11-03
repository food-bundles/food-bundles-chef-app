import { request } from './http-client';

export interface CatalogProductDto {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  reference_price: string | null;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  updated_at: string;
}

export function listCatalogProducts(category?: string): Promise<CatalogProductDto[]> {
  const params = category ? `?category=${encodeURIComponent(category)}` : '';
  return request(`/catalog/products${params}`);
}
