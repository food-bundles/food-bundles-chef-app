/**
 * Countries and time zones for kitchen setup, from the IANA tz database (src/lib/countries.json
 * is generated from the backend's tzdata tables), plus the device's own region as defaults.
 */
import { getCalendars, getLocales } from 'expo-localization';
import countriesJson from './countries.json';
import { isCurrency } from './money';
import { toAppLanguage } from './format';

interface CountryEntry {
  name: string;
  zones: string[];
}

const COUNTRIES = (countriesJson as { countries: Record<string, CountryEntry> }).countries;
const LOCALE: Record<'en' | 'fr' | 'rw', string> = { en: 'en', fr: 'fr', rw: 'en' };

export function isCountry(code: string | null | undefined): boolean {
  return !!code && COUNTRIES[code.toUpperCase()] !== undefined;
}

/** All country codes, sorted. */
export function countryCodes(): string[] {
  return Object.keys(COUNTRIES).sort();
}

/** Localised country name when the device has the data, else the IANA English name. */
export function countryName(code: string, lang?: string): string {
  const fallback = COUNTRIES[code.toUpperCase()]?.name ?? code;
  try {
    const names = new Intl.DisplayNames([LOCALE[toAppLanguage(lang)]], { type: 'region' });
    return names.of(code.toUpperCase()) ?? fallback;
  } catch {
    return fallback;
  }
}

/** IANA zones used in the country (first = most populous region). */
export function countryZones(code: string): string[] {
  return COUNTRIES[code.toUpperCase()]?.zones ?? [];
}

/** Every zone any country uses, sorted (the time zone picker's list). */
export function allZones(): string[] {
  return Array.from(new Set(Object.values(COUNTRIES).flatMap((c) => c.zones))).sort();
}

export interface RegionDefaults {
  country: string | null;
  currency: string | null;
  timezone: string | null;
}

/** Suggestions from the device (the chef confirms them); null when the device doesn't say. */
export function deviceRegionDefaults(): RegionDefaults {
  let country: string | null = null;
  let currency: string | null = null;
  let timezone: string | null = null;
  try {
    for (const locale of getLocales()) {
      if (!country && isCountry(locale.regionCode)) country = locale.regionCode!.toUpperCase();
      if (!currency && isCurrency(locale.currencyCode)) currency = locale.currencyCode!.toUpperCase();
    }
    const zone = getCalendars()[0]?.timeZone ?? null;
    timezone = zone && allZones().includes(zone) ? zone : null;
  } catch {
    // No locale data on this device: the chef picks everything.
  }
  if (!timezone && country) timezone = countryZones(country)[0] ?? null;
  return { country, currency, timezone };
}
