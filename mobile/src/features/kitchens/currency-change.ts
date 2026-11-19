import type { CurrencyChangeBody, CurrencyChangeMode, CurrencyChangePreviewDto } from '@/api/kitchens-api';
import type { RateDto } from '@/api/money-dto';

/**
 * Whether the chef may confirm a previewed currency change.
 * The server re-checks everything; this only keeps the button honest.
 * Relabel needs the new code typed exactly (case and spaces ignored).
 */
export function canApplyCurrencyChange(preview: CurrencyChangePreviewDto | undefined, typed: string): boolean {
  if (!preview || !preview.can_apply) return false;
  if (preview.mode === 'relabel') {
    return typed.trim().toUpperCase() === (preview.confirmation_text ?? '').toUpperCase();
  }
  return preview.rate !== null;
}

/** Body for the apply call: convert sends back the exact rate and date the preview showed. */
export function currencyChangeBody(preview: CurrencyChangePreviewDto, typed: string): CurrencyChangeBody {
  return preview.mode === 'convert'
    ? { to_currency: preview.to_currency, mode: 'convert', rate: preview.rate?.rate ?? null, rate_date: preview.rate?.rate_date ?? null }
    : { to_currency: preview.to_currency, mode: 'relabel', confirmation: typed.trim() };
}

/** "1 EUR = 1,624.55 RWF": the rate with enough digits to be meaningful, never a float sum. */
export function formatRate(rate: RateDto, lang?: string): string {
  const value = Number(rate.rate);
  const digits = value >= 100 ? 2 : value >= 1 ? 4 : 6;
  let shown: string;
  try {
    shown = new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', { maximumFractionDigits: digits }).format(value);
  } catch {
    shown = value.toFixed(digits);
  }
  return `1 ${rate.base} = ${shown} ${rate.quote}`;
}

/** The modes offered on the change-currency screen, in display order. */
export const CURRENCY_CHANGE_MODES: readonly CurrencyChangeMode[] = ['convert', 'relabel'];

/** Modes this kitchen can use: "convert" needs conversion, which is off outside the enabled countries. */
export function currencyChangeModes(conversionEnabled: boolean): readonly CurrencyChangeMode[] {
  return conversionEnabled ? CURRENCY_CHANGE_MODES : ['relabel'];
}

/**
 * Keep only what a cost may contain: digits and one decimal separator (comma or dot),
 * with at most `maxDecimals` decimals (unit costs keep 6). Returns a dot-decimal string.
 */
export function sanitiseCostInput(text: string, maxDecimals = 6): string {
  const cleaned = text.replace(',', '.').replace(/[^0-9.]/g, '');
  const [int = '', ...rest] = cleaned.split('.');
  if (rest.length === 0) return int;
  return `${int}.${rest.join('').slice(0, maxDecimals)}`;
}

/** "0.001250" → "0.00125", "8.00" → "8", "3500" → "3500" (only zeros after a decimal point). */
export function trimDecimalZeros(value: string): string {
  if (!value.includes('.')) return value;
  return value.replace(/0+$/, '').replace(/\.$/, '');
}
