/**
 * Money for any currency: amount + ISO 4217 code, formatted per currency and language.
 *
 * Decimal places come from the ISO 4217 table shared with the backend
 * (src/lib/iso4217.json is a copy of backend/app/shared/data/iso4217.json; a test checks
 * they match). Rwanda is one ordinary case: RWF simply has 0 decimals.
 */
import iso4217 from './iso4217.json';
import { toAppLanguage } from './format';

interface CurrencyEntry {
  name: string;
  minor_units: number;
  fund?: boolean;
}

const TABLE = (iso4217 as { currencies: Record<string, CurrencyEntry> }).currencies;

/** Language → number locale. Kinyarwanda often lacks Intl data on device: use English grouping. */
const LOCALE: Record<'en' | 'fr' | 'rw', string> = { en: 'en', fr: 'fr', rw: 'en' };

/** True for an ISO 4217 code a kitchen can price in (fund codes excluded). */
export function isCurrency(code: string | null | undefined): boolean {
  if (!code) return false;
  const entry = TABLE[code.toUpperCase()];
  return entry !== undefined && entry.fund !== true;
}

/** Decimal places of the currency: RWF 0, USD 2, KWD 3. Unknown codes → 2. */
export function minorUnits(code: string): number {
  return TABLE[code.toUpperCase()]?.minor_units ?? 2;
}

/** Codes a kitchen can choose, sorted. */
export function priceableCurrencies(): string[] {
  return Object.keys(TABLE)
    .filter((c) => TABLE[c]?.fund !== true)
    .sort();
}

/** Localised currency name when the device has the data ("euro"), else the ISO name ("Euro"). */
export function currencyName(code: string, lang?: string): string {
  const fallback = TABLE[code.toUpperCase()]?.name ?? code;
  try {
    const names = new Intl.DisplayNames([LOCALE[toAppLanguage(lang)]], { type: 'currency' });
    return names.of(code.toUpperCase()) ?? fallback;
  } catch {
    return fallback;
  }
}

function toNumber(amount: number | string | null | undefined): number | null {
  if (amount === null || amount === undefined || amount === '') return null;
  const n = typeof amount === 'string' ? Number(amount) : amount;
  return Number.isFinite(n) ? n : null;
}

function groupDigits(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Fallback without Intl currency support: grouping, the currency's decimals, then the code. */
export function formatMoneyFallback(amount: number, currency: string): string {
  const digits = minorUnits(currency);
  const fixed = Math.abs(amount).toFixed(digits);
  const [int = '0', frac] = fixed.split('.');
  const sign = amount < 0 ? '-' : '';
  return `${sign}${groupDigits(int)}${frac ? `.${frac}` : ''} ${currency.toUpperCase()}`;
}

/**
 * Amount in its currency, e.g. "RWF 3,500", "€7.99", "7,99 €" (fr), "$7.99".
 * Always the currency's own decimal places; never converted. Missing amounts render "—".
 */
export function formatMoney(
  amount: number | string | null | undefined,
  currency: string,
  lang?: string,
): string {
  const n = toNumber(amount);
  if (n === null) return '—';
  if (!currency) {
    // Currency not known (yet): the number alone, never a guessed currency.
    return new Intl.NumberFormat(LOCALE[toAppLanguage(lang)], { maximumFractionDigits: 2 }).format(n);
  }
  const digits = minorUnits(currency);
  try {
    return new Intl.NumberFormat(LOCALE[toAppLanguage(lang)], {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(n);
  } catch {
    return formatMoneyFallback(n, currency);
  }
}

/**
 * A unit cost (per g, per kg, per piece): at least the currency's decimals and up to 6, so
 * 0.00125 USD per gram is not shown as "$0.00". Prices people pay use formatMoney.
 */
export function formatUnitCost(
  amount: number | string | null | undefined,
  currency: string,
  lang?: string,
): string {
  const n = toNumber(amount);
  if (n === null) return '—';
  const digits = minorUnits(currency);
  try {
    return new Intl.NumberFormat(LOCALE[toAppLanguage(lang)], {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: digits,
      maximumFractionDigits: Math.max(digits, 6),
    }).format(n);
  } catch {
    return `${String(n)} ${currency.toUpperCase()}`;
  }
}

/** Integer minor units ↔ decimal string, exact (no floating point arithmetic on money). */
export function toMinorUnits(amount: string, currency: string): number | null {
  const digits = minorUnits(currency);
  const match = /^(-)?(\d+)(?:\.(\d+))?$/.exec(amount.trim());
  if (!match) return null;
  const [, sign, int = '0', frac = ''] = match;
  if (frac.length > digits) return null; // more decimals than the currency allows
  const units = Number(int + frac.padEnd(digits, '0'));
  return sign ? -units : units;
}

export function fromMinorUnits(units: number, currency: string): string {
  const digits = minorUnits(currency);
  if (digits === 0) return String(units);
  const sign = units < 0 ? '-' : '';
  const s = String(Math.abs(units)).padStart(digits + 1, '0');
  return `${sign}${s.slice(0, -digits)}.${s.slice(-digits)}`;
}

/**
 * What a price field accepts while typing, for `currency`: digits and one decimal separator
 * ("," becomes "."), at most the currency's decimals (7.99 EUR; whole RWF, so "1500.5" →
 * "1500"). Never rounds: extra digits are simply not taken.
 */
export function sanitisePriceInput(text: string, currency: string): string {
  const digits = minorUnits(currency || 'XXX');
  const cleaned = text.replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const [whole = '', ...rest] = cleaned.split('.');
  if (digits === 0 || rest.length === 0) return whole;
  return `${whole}.${rest.join('').slice(0, digits)}`;
}

/**
 * Totals per currency, never added across currencies (sums in minor units, so 0.1 + 0.2 is
 * exactly 0.30). Order of first appearance is kept.
 */
export function sumByCurrency(items: readonly { amount: number; currency: string }[]): { amount: number; currency: string }[] {
  const totals = new Map<string, number>();
  for (const { amount, currency } of items) {
    if (!Number.isFinite(amount)) continue;
    const code = currency.toUpperCase();
    const scale = 10 ** minorUnits(code || 'XXX');
    totals.set(code, (totals.get(code) ?? 0) + Math.round(amount * scale));
  }
  return [...totals].map(([currency, units]) => ({ amount: units / 10 ** minorUnits(currency || 'XXX'), currency }));
}

/** "RWF 35,000 + €20.00": one formatted amount per currency; "—" when empty. */
export function formatMoneyList(items: readonly { amount: number; currency: string }[], lang?: string): string {
  if (items.length === 0) return '—';
  return items.map((m) => formatMoney(m.amount, m.currency, lang)).join(' + ');
}
