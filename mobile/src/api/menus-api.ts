import { request } from './http-client';

// ── DTOs ─────────────────────────────────────────────────────────────────────

export interface MenuCreateBody {
  name: string;
  description?: string | null;
}

export interface MenuUpdateBody {
  name?: string | null;
  description?: string | null;
  is_active?: boolean | null;
}

export interface MenuDto {
  id: string;
  kitchen_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuItemCreateBody {
  name: string;
  description?: string | null;
  selling_price: string;   // decimal string
}

export interface MenuItemUpdateBody {
  name?: string | null;
  description?: string | null;
  selling_price?: string | null;
  is_active?: boolean | null;
}

export interface MenuItemDto {
  id: string;
  menu_id: string;
  kitchen_id: string;
  name: string;
  description: string | null;
  selling_price: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecipeLineCreateBody {
  ingredient_id: string;
  qty_per_portion: string;
  yield_fraction_override?: string | null;
  unit: string;
  notes?: string | null;
}

export interface RecipeLineUpdateBody {
  qty_per_portion?: string | null;
  yield_fraction_override?: string | null;
  unit?: string | null;
  notes?: string | null;
}

export interface RecipeLineDto {
  id: string;
  menu_item_id: string;
  kitchen_id: string;
  ingredient_id: string;
  qty_per_portion: string;
  yield_fraction_override: string | null;
  unit: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecipeCostLine {
  ingredient_id: string;
  ingredient_name: string;
  unit: string;
  qty_per_portion: string;
  effective_yield: string;
  cost_contribution: string | null;
}

export interface RecipeCostDto {
  menu_item_id: string;
  total_cost_per_portion: string | null;
  lines: RecipeCostLine[];
}

// ── API calls ─────────────────────────────────────────────────────────────────

// Menus
export function listMenus(kitchenId: string): Promise<MenuDto[]> {
  return request<MenuDto[]>(`/kitchens/${kitchenId}/menus`);
}

export function createMenu(kitchenId: string, body: MenuCreateBody): Promise<MenuDto> {
  return request<MenuDto>(`/kitchens/${kitchenId}/menus`, { method: 'POST', body });
}

export function updateMenu(
  kitchenId: string,
  menuId: string,
  body: MenuUpdateBody
): Promise<MenuDto> {
  return request<MenuDto>(`/kitchens/${kitchenId}/menus/${menuId}`, { method: 'PATCH', body });
}

// Menu items
export function listMenuItems(kitchenId: string, menuId: string): Promise<MenuItemDto[]> {
  return request<MenuItemDto[]>(`/kitchens/${kitchenId}/menus/${menuId}/items`);
}

export function createMenuItem(
  kitchenId: string,
  menuId: string,
  body: MenuItemCreateBody
): Promise<MenuItemDto> {
  return request<MenuItemDto>(`/kitchens/${kitchenId}/menus/${menuId}/items`, {
    method: 'POST',
    body,
  });
}

export function updateMenuItem(
  kitchenId: string,
  menuId: string,
  itemId: string,
  body: MenuItemUpdateBody
): Promise<MenuItemDto> {
  return request<MenuItemDto>(`/kitchens/${kitchenId}/menus/${menuId}/items/${itemId}`, {
    method: 'PATCH',
    body,
  });
}

// Recipe lines
export function listRecipeLines(
  kitchenId: string,
  menuItemId: string
): Promise<RecipeLineDto[]> {
  return request<RecipeLineDto[]>(
    `/kitchens/${kitchenId}/menu-items/${menuItemId}/recipe`
  );
}

export function addRecipeLine(
  kitchenId: string,
  menuItemId: string,
  body: RecipeLineCreateBody
): Promise<RecipeLineDto> {
  return request<RecipeLineDto>(
    `/kitchens/${kitchenId}/menu-items/${menuItemId}/recipe`,
    { method: 'POST', body }
  );
}

export function updateRecipeLine(
  kitchenId: string,
  menuItemId: string,
  lineId: string,
  body: RecipeLineUpdateBody
): Promise<RecipeLineDto> {
  return request<RecipeLineDto>(
    `/kitchens/${kitchenId}/menu-items/${menuItemId}/recipe/${lineId}`,
    { method: 'PATCH', body }
  );
}

export function deleteRecipeLine(
  kitchenId: string,
  menuItemId: string,
  lineId: string
): Promise<void> {
  return request<void>(
    `/kitchens/${kitchenId}/menu-items/${menuItemId}/recipe/${lineId}`,
    { method: 'DELETE' }
  );
}

export function deleteMenuItem(
  kitchenId: string,
  menuId: string,
  itemId: string
): Promise<void> {
  return request<void>(`/kitchens/${kitchenId}/menus/${menuId}/items/${itemId}`, {
    method: 'DELETE',
  });
}

export function getRecipeCost(kitchenId: string, menuItemId: string): Promise<RecipeCostDto> {
  return request<RecipeCostDto>(
    `/kitchens/${kitchenId}/menu-items/${menuItemId}/recipe/cost`
  );
}
