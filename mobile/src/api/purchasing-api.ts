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
