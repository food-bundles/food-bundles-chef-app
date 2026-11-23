import { request } from './http-client';
import type { CommandStatus, CommandType, StaffRole } from '@/domain/rules/commands';

// ── DTOs (mirror backend app/modules/commands/schemas.py) ───────────────────

export interface StaffDto {
  id: string;
  kitchen_id: string;
  name: string;
  role: StaffRole;
  is_active: boolean;
}

export interface CommandLineDto {
  id: string;
  menu_item_id: string;
  dish_name: string;
  qty: number;
  accepted_qty: number | null;
  unit_price: string;
  unit_price_currency: string;
}

export interface MissingDto {
  ingredient_id: string;
  name: string;
  unit: string;
  need: string;
  have: string;
  short: string;
}

export interface StockCheckDto {
  enough: boolean;
  missing: MissingDto[];
  max_portions: number;
  total_portions: number;
  decline_message: string | null;
}

export interface CommandDto {
  id: string;
  kitchen_id: string;
  service_date: string;
  number: number;
  type: CommandType;
  table_no: string | null;
  source: string;
  recorded_by_name: string;
  recorded_by_role: StaffRole;
  status: CommandStatus;
  decline_message: string | null;
  created_at: string;
  lines: CommandLineDto[];
  stock_check: StockCheckDto | null;
}

export interface DishTodayDto {
  menu_item_id: string;
  name: string;
  category: string | null;
  selling_price: string;
  currency: string | null;
  is_active: boolean;
  ordered_today: number;
  can_make: number | null;
}

export interface CommandCountsDto {
  new: number;
  cooking: number;
  served: number;
  cancelled: number;
  declined: number;
}

export interface CommandsTodayDto {
  service_date: string;
  opening_time: string;
  next_number: number;
  counts: CommandCountsDto;
  commands: CommandDto[];
  dishes: DishTodayDto[];
}

export interface CommandCreateBody {
  /** Client-generated id: the same command sent twice (offline retry) is one command. */
  id: string;
  type: CommandType;
  table_no?: string | null;
  /** A staff member; omitted = the chef. */
  staff_id?: string | null;
  lines: { menu_item_id: string; qty: number }[];
}

export type CommandAction =
  | { action: 'accept'; portions?: Record<string, number> }
  | { action: 'decline'; add_to_requisition: boolean }
  | { action: 'serve' }
  | { action: 'cancel' };

// ── API calls ────────────────────────────────────────────────────────────────

export function getCommandsToday(kitchenId: string): Promise<CommandsTodayDto> {
  return request<CommandsTodayDto>(`/kitchens/${kitchenId}/commands/today`);
}

export function listStaff(kitchenId: string): Promise<StaffDto[]> {
  return request<StaffDto[]>(`/kitchens/${kitchenId}/staff`);
}

export function createStaff(kitchenId: string, body: { name: string; role: StaffRole }): Promise<StaffDto> {
  return request<StaffDto>(`/kitchens/${kitchenId}/staff`, { method: 'POST', body });
}

export function updateStaff(
  kitchenId: string,
  staffId: string,
  body: { name?: string; role?: StaffRole; is_active?: boolean },
): Promise<StaffDto> {
  return request<StaffDto>(`/kitchens/${kitchenId}/staff/${staffId}`, { method: 'PATCH', body });
}
