import type { MoneyDto } from './money-dto';
import { request } from './http-client';

export interface CatalogProductDto {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  /** Deprecated (one release): use reference_price_money. */
  reference_price: string | null;
  reference_price_currency: string | null;
  reference_price_money: MoneyDto | null;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  updated_at: string;
}

export function listCatalogProducts(category?: string): Promise<CatalogProductDto[]> {
  const params = category ? `?category=${encodeURIComponent(category)}` : '';
  return request(`/catalog/products${params}`);
}
