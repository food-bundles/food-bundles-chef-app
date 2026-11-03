import { request } from './http-client';

// ── DTOs ─────────────────────────────────────────────────────────────────────

export type InventoryEntryType = 'opening' | 'adjustment' | 'closing' | 'delivery';

export interface InventoryEntryCreateBody {
  ingredient_id: string;
  quantity: string;              // decimal string, >= 0
  entry_type?: InventoryEntryType;
  notes?: string | null;
}

export interface InventoryEntryDto {
  id: string;
  kitchen_id: string;
  ingredient_id: string;
  quantity: string;
  entry_type: string;
  notes: string | null;
  recorded_by: string | null;
  recorded_at: string;
}

export interface StockLevelDto {
  ingredient_id: string;
  ingredient_name: string;
  unit: string;
  current_stock: string;
  expected_daily_use: string | null;
  days_cover: string | null;
  is_low_stock: boolean;
  last_recorded_at: string | null;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export function getStockLevels(kitchenId: string): Promise<StockLevelDto[]> {
  return request<StockLevelDto[]>(`/kitchens/${kitchenId}/inventory`);
}

export function recordInventoryEntry(
  kitchenId: string,
  body: InventoryEntryCreateBody
): Promise<InventoryEntryDto> {
  return request<InventoryEntryDto>(`/kitchens/${kitchenId}/inventory`, {
    method: 'POST',
    body,
  });
}

export function getInventoryHistory(
  kitchenId: string,
  ingredientId: string
): Promise<InventoryEntryDto[]> {
  return request<InventoryEntryDto[]>(
    `/kitchens/${kitchenId}/inventory/${ingredientId}/history`
  );
}
