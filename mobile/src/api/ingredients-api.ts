import { request } from './http-client';

// ── DTOs ─────────────────────────────────────────────────────────────────────

export interface IngredientCreateBody {
  name: string;
  unit: string;
  yield_fraction?: string;        // decimal string e.g. "0.85"
  qty_per_portion?: string;
  cost_per_unit?: string | null;
  selling_unit_size?: string;
  days_open_per_week?: number;
  safety_buffer_fraction?: string | null;
  notes?: string | null;
}

export interface IngredientUpdateBody {
  name?: string | null;
  unit?: string | null;
  yield_fraction?: string | null;
  qty_per_portion?: string | null;
  cost_per_unit?: string | null;
  selling_unit_size?: string | null;
  days_open_per_week?: number | null;
  safety_buffer_fraction?: string | null;
  notes?: string | null;
}

export interface IngredientDto {
  id: string;
  kitchen_id: string;
  name: string;
  unit: string;
  yield_fraction: string;
  qty_per_portion: string;
  cost_per_unit: string | null;
  selling_unit_size: string;
  days_open_per_week: number;
  safety_buffer_fraction: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export function listIngredients(kitchenId: string): Promise<IngredientDto[]> {
  return request<IngredientDto[]>(`/kitchens/${kitchenId}/ingredients`);
}

export function getIngredient(kitchenId: string, ingredientId: string): Promise<IngredientDto> {
  return request<IngredientDto>(`/kitchens/${kitchenId}/ingredients/${ingredientId}`);
}

export function createIngredient(
  kitchenId: string,
  body: IngredientCreateBody
): Promise<IngredientDto> {
  return request<IngredientDto>(`/kitchens/${kitchenId}/ingredients`, {
    method: 'POST',
    body,
  });
}

export function updateIngredient(
  kitchenId: string,
  ingredientId: string,
  body: IngredientUpdateBody
): Promise<IngredientDto> {
  return request<IngredientDto>(`/kitchens/${kitchenId}/ingredients/${ingredientId}`, {
    method: 'PATCH',
    body,
  });
}

export function deleteIngredient(kitchenId: string, ingredientId: string): Promise<void> {
  return request<void>(`/kitchens/${kitchenId}/ingredients/${ingredientId}`, {
    method: 'DELETE',
  });
}
