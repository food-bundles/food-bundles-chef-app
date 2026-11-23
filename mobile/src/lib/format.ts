/**
 * Locale-aware formatting for money, quantities and dates.
 * Kinyarwanda often lacks Intl locale data on device, so it falls back to `en-RW`
 * number grouping and numeric dates; only the surrounding words are translated.
 */

export type AppLanguage = 'en' | 'fr' | 'rw';

const NUMBER_LOCALE: Record<AppLanguage, string> = {
  en: 'en-RW',
  fr: 'fr-RW',
  rw: 'en-RW',
};

function groupThousands(n: number): string {
  const sign = n < 0 ? '-' : '';
  const digits = String(Math.abs(Math.trunc(n)));
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** App language from an i18next / device language tag ("fr-RW" → "fr"); unsupported → "en". */
export function toAppLanguage(lang: string | undefined): AppLanguage {
  const base = (lang ?? 'en').slice(0, 2).toLowerCase();
  return base === 'fr' || base === 'rw' ? base : 'en';
}

const toLanguage = toAppLanguage;

/** Integer with thousands separators in the given language (no decimals). */
export function formatInteger(value: number, lang?: string): string {
  const rounded = Math.round(value);
  try {
    return new Intl.NumberFormat(NUMBER_LOCALE[toLanguage(lang)], { maximumFractionDigits: 0 }).format(rounded);
  } catch {
    return groupThousands(rounded);
  }
}

// Money is formatted by formatMoney (src/lib/money.ts), always in the amount's own currency.

/** Quantity with at most 2 decimals and trailing zeros trimmed: 500.0000 → "500", 0.250 → "0.25". */
export function formatQuantity(value: number | string | null | undefined, lang?: string): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (n == null || !Number.isFinite(n)) return '—';
  const rounded = Math.round(n * 100) / 100;
  try {
    return new Intl.NumberFormat(NUMBER_LOCALE[toLanguage(lang)], {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(rounded);
  } catch {
    const fixed = rounded.toFixed(2).replace(/\.?0+$/, '');
    const [int, frac] = fixed.split('.');
    return frac ? `${groupThousands(Number(int))}.${frac}` : groupThousands(Number(int));
  }
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Calendar date for display, e.g. "17 Nov 2026" (en/fr) or "17/11/2026" (rw). */
export function formatDate(value: Date | string, lang?: string): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  const language = toLanguage(lang);
  if (language === 'rw') return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  try {
    return new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  }
}

/**
 * A kitchen day ("YYYY-MM-DD") as weekday + day + month, e.g. "Wed 18 Nov" (en),
 * "mer. 18 nov." (fr) or "18/11" (rw, which lacks Intl data). The date is read as a calendar
 * day, so the device's time zone never shifts it.
 */
export function formatDayShort(isoDay: string, lang?: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDay);
  if (!m) return '—';
  const language = toLanguage(lang);
  if (language === 'rw') return `${m[3]}/${m[2]}`;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  try {
    const parts = new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }).formatToParts(d);
    const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? '';
    return `${get('weekday')} ${get('day')} ${get('month')}`.trim();
  } catch {
    return `${m[3]}/${m[2]}`;
  }
}

/** 24-hour clock time, e.g. "14:05" — the convention in Rwanda for all three languages. */
export function formatTime(value: Date | string): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Month and year, e.g. "November 2026" (en/fr) or "11/2026" (rw). */
export function formatMonthYear(value: Date | string, lang?: string): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  const language = toLanguage(lang);
  if (language === 'rw') return `${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  try {
    return new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-GB', { month: 'long', year: 'numeric' }).format(d);
  } catch {
    return `${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  }
}

/** Local calendar day as YYYY-MM-DD (not UTC — a sale at 01:00 in Kigali belongs to today). */
export function localISODate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * The kitchen's calendar day (YYYY-MM-DD) in its IANA time zone (decision 8): a sale at
 * 00:30 in Paris belongs to Paris's date even if the phone or UTC says otherwise.
 * Falls back to the device's day when no zone is known or Intl cannot resolve it.
 */
export function kitchenISODate(timeZone: string | null | undefined, d: Date = new Date()): string {
  if (!timeZone) return localISODate(d);
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d);
    const get = (type: string): string | undefined => parts.find((p) => p.type === type)?.value;
    const year = get('year');
    const month = get('month');
    const day = get('day');
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    // Unknown zone or no Intl time-zone data: the device's day is the best available.
  }
  return localISODate(d);
}
