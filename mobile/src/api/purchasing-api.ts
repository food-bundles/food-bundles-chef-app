import { request } from './http-client';

// ── DTOs ─────────────────────────────────────────────────────────────────────

export interface PurchaseSuggestionDto {
  ingredient_id: string;
  ingredient_name: string;
  unit: string;
  current_stock: string;
  expected_daily_use: string;
  days_cover: string | null;
  is_low_stock: boolean;
  weighted_demand_portions: string;
  suggested_qty: string;
  selling_unit_size: string;
  estimated_cost: string | null;
}

export interface PurchaseSuggestionsResponseDto {
  kitchen_id: string;
  suggestions: PurchaseSuggestionDto[];
}

// ── API calls ─────────────────────────────────────────────────────────────────

/**
 * Fetch server-computed purchase suggestions.
 *
 * The backend is the authority for all demand, stock, and purchase calculations.
 * The four-week weighted formula (latest 40%, prior three weeks 20% each) and the
 * default 10% safety buffer are applied server-side — mobile must NOT re-derive them.
 */
export function getPurchaseSuggestions(
  kitchenId: string
): Promise<PurchaseSuggestionsResponseDto> {
  return request<PurchaseSuggestionsResponseDto>(
    `/kitchens/${kitchenId}/purchasing/suggestions`
  );
}

// ── Phase 9: suggested requisition (spec screen 11) ──────────────────────────

/** Mirrors backend RequisitionLine (decimals as strings). */
export interface RequisitionLineDto {
  ingredient_id: string;
  catalog_product_id: string | null;
  name: string;
  unit: string;
  left: string;
  need: string;
  pack_size: string;
  suggested_qty: string;
  price_per_unit: string | null;
  currency: string | null;
  fb_price: boolean;
  line_total: string | null;
}

export interface RequisitionDto {
  for_date: string;
  lines: RequisitionLineDto[];
  items: number;
  total: string;
  currency: string;
}

/** Tomorrow's suggested requisition (last 7 same weekdays, declined shortages, pack sizes). */
export function getSuggestedRequisition(kitchenId: string): Promise<RequisitionDto> {
  return request<RequisitionDto>(`/kitchens/${kitchenId}/purchasing/requisition`);
}
