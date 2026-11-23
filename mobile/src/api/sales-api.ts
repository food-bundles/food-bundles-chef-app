import type { MoneyDto } from './money-dto';
import { request, type WriteOptions } from './http-client';

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

/**
 * Same-day sales. Revenue is one subtotal per currency (prices recorded with each sale),
 * never added across currencies; `revenue` is the kitchen-currency subtotal.
 */
export interface DailySalesSummaryDto {
  day: string;
  portions: number;
  revenue: string; // decimal string in `currency`
  currency: string;
  revenue_by_currency?: MoneyDto[];
  mixed_currencies?: boolean;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export function getDailySalesSummary(kitchenId: string, day: string): Promise<DailySalesSummaryDto> {
  return request<DailySalesSummaryDto>(
    `/kitchens/${kitchenId}/sales/daily-summary?date=${encodeURIComponent(day)}`
  );
}

export function recordSale(
  kitchenId: string,
  body: SaleRecordCreateBody,
  opts: WriteOptions = {}
): Promise<SaleRecordDto> {
  return request<SaleRecordDto>(`/kitchens/${kitchenId}/sales`, {
    method: 'POST',
    body,
    idempotencyKey: opts.idempotencyKey,
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
