import { request } from './http-client';
import type { MoneyDto, RateDto } from './money-dto';

// ── DTOs ─────────────────────────────────────────────────────────────────────

export interface KitchenCreateBody {
  name: string;
  location?: string | null;
  address?: string | null;
  phone?: string | null;
  /** ISO 4217, e.g. RWF, EUR. */
  currency: string;
  /** IANA zone, e.g. Africa/Kigali. */
  timezone: string;
  /** ISO 3166-1 alpha-2. */
  country: string;
}

export interface KitchenUpdateBody {
  name?: string | null;
  location?: string | null;
  address?: string | null;
  phone?: string | null;
  /** Only accepted unchanged: a real change uses the convert / relabel flow. */
  currency?: string | null;
  timezone?: string | null;
  country?: string | null;
  /** Step for suggested prices; "0" clears it. */
  price_step?: string | null;
}

export interface KitchenDto {
  id: string;
  chef_id: string;
  name: string;
  location: string | null;
  address: string | null;
  phone: string | null;
  currency: string;
  timezone: string;
  country: string | null;
  /** Food Bundles catalogue and catalogue requisitions are offered to this kitchen. */
  catalog_available: boolean;
  /** Currency conversion offered (CURRENCY_CONVERSION_ENABLED_COUNTRIES); older servers omit it. */
  conversion_enabled?: boolean;
  /** Step for suggested selling prices (major units); null = the currency's default. */
  price_step: string | null;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

// ── Currency change (convert / relabel) and exchange rates ───────────────────

export type CurrencyChangeMode = 'convert' | 'relabel';

export interface CurrencyChangeBody {
  to_currency: string;
  mode: CurrencyChangeMode;
  /** relabel: the new currency code typed by the chef. */
  confirmation?: string | null;
  /** convert: the rate and date the preview showed (refused if the server's rate changed). */
  rate?: string | null;
  rate_date?: string | null;
}

export interface PriceChangeDto {
  kind: 'menu_item' | 'ingredient_cost';
  id: string;
  name: string;
  before: MoneyDto;
  after: MoneyDto | null;
  /** "too_many_decimals": relabelling would need rounding. */
  problem: string | null;
}

export interface CurrencyChangePreviewDto {
  from_currency: string;
  to_currency: string;
  mode: CurrencyChangeMode;
  rate: RateDto | null;
  rate_unavailable: boolean;
  history: { sales: number; orders: number; stock_entries: number; deliveries: number; has_history: boolean };
  prices: PriceChangeDto[];
  can_apply: boolean;
  blocked_reason: string | null;
  confirmation_text: string | null;
  price_step_reset: boolean;
}

export interface CurrencyChangeResultDto {
  kitchen: KitchenDto;
  mode: CurrencyChangeMode;
  from_currency: string;
  to_currency: string;
  menu_items_changed: number;
  ingredient_costs_changed: number;
  rate: RateDto | null;
}

export interface RateLookupDto {
  available: boolean;
  base: string;
  quote: string;
  on_date: string;
  max_age_days: number;
  rate: RateDto | null;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export function previewCurrencyChange(
  kitchenId: string,
  body: Pick<CurrencyChangeBody, 'to_currency' | 'mode'>,
): Promise<CurrencyChangePreviewDto> {
  return request<CurrencyChangePreviewDto>(`/kitchens/${kitchenId}/currency-change/preview`, {
    method: 'POST',
    body,
  });
}

/** Online only: never queued offline (it rewrites every price at once). */
export function applyCurrencyChange(kitchenId: string, body: CurrencyChangeBody): Promise<CurrencyChangeResultDto> {
  return request<CurrencyChangeResultDto>(`/kitchens/${kitchenId}/currency-change`, { method: 'POST', body });
}

export function getExchangeRate(kitchenId: string, base: string, quote?: string): Promise<RateLookupDto> {
  const params = new URLSearchParams({ base });
  if (quote) params.set('quote', quote);
  return request<RateLookupDto>(`/kitchens/${kitchenId}/exchange-rates?${params.toString()}`);
}

export function listKitchens(): Promise<KitchenDto[]> {
  return request<KitchenDto[]>('/kitchens');
}

export function getKitchen(kitchenId: string): Promise<KitchenDto> {
  return request<KitchenDto>(`/kitchens/${kitchenId}`);
}

export function createKitchen(body: KitchenCreateBody): Promise<KitchenDto> {
  return request<KitchenDto>('/kitchens', { method: 'POST', body });
}

export function updateKitchen(kitchenId: string, body: KitchenUpdateBody): Promise<KitchenDto> {
  return request<KitchenDto>(`/kitchens/${kitchenId}`, { method: 'PATCH', body });
}

export function archiveKitchen(kitchenId: string): Promise<KitchenDto> {
  return request<KitchenDto>(`/kitchens/${kitchenId}/archive`, { method: 'POST' });
}
