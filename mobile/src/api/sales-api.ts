import { request } from './http-client';

// ── DTOs ─────────────────────────────────────────────────────────────────────

export interface SaleRecordCreateBody {
  menu_item_id: string;
  sale_date: string;       // ISO date "YYYY-MM-DD"
  portions_sold: number;
}

export interface SaleRecordDto {
  id: string;
  kitchen_id: string;
  menu_item_id: string;
  sale_date: string;
  portions_sold: number;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeeklyTotalDto {
  week_start: string;
  total_portions: number;
}

export interface WeeklySalesSummaryDto {
  menu_item_id: string;
  menu_item_name: string;
  weeks: WeeklyTotalDto[];
}

// ── API calls ─────────────────────────────────────────────────────────────────

export function recordSale(
  kitchenId: string,
  body: SaleRecordCreateBody
): Promise<SaleRecordDto> {
  return request<SaleRecordDto>(`/kitchens/${kitchenId}/sales`, {
    method: 'POST',
    body,
  });
}

export function getWeeklySalesSummary(
  kitchenId: string,
  menuItemId: string
): Promise<WeeklySalesSummaryDto> {
  return request<WeeklySalesSummaryDto>(
    `/kitchens/${kitchenId}/sales/${menuItemId}/weekly`
  );
}
