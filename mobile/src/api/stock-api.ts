import { request } from './http-client';
import type { StockLevel } from '@/domain/calculations/stock-day';

/** Mirrors backend StockDayRow (decimals as strings). */
export interface StockDayRowDto {
  ingredient_id: string;
  name: string;
  unit: string;
  start: string;
  received: string;
  used: string;
  counted: string;
  left: string;
  level: StockLevel;
  avg_service_use: string | null;
}

export interface StockDayDto {
  day: string;
  rows: StockDayRowDto[];
}

export interface UsedByDto {
  menu_item_id: string;
  dish_name: string;
  portions: number;
  quantity: string;
}

export type CountReason = 'waste' | 'spoilage' | 'error';

export function getStockToday(kitchenId: string): Promise<StockDayDto> {
  return request<StockDayDto>(`/kitchens/${kitchenId}/stock/today`);
}

export function getUsedBy(kitchenId: string, ingredientId: string): Promise<UsedByDto[]> {
  return request<UsedByDto[]>(`/kitchens/${kitchenId}/stock/${ingredientId}/used-by`);
}
