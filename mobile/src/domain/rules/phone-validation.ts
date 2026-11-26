import type { Country } from '@/data/countries';

/**
 * Phone number validation rules per country.
 * Length is after removing the leading zero (if any) and dial code.
 */
interface ValidationRule {
  /** Expected digit count for local part (without dial code) */
  minLength: number;
  maxLength: number;
}

/**
 * Country-specific phone validation rules.
 * Default rule: 7-15 digits (covers most countries).
 */
const COUNTRY_RULES: Record<string, ValidationRule> = {
  RW: { minLength: 9, maxLength: 9 }, // Rwanda: 9 digits (e.g. 788123456)
  US: { minLength: 10, maxLength: 10 }, // US/Canada: 10 digits
  CA: { minLength: 10, maxLength: 10 },
  GB: { minLength: 10, maxLength: 10 }, // UK: 10 digits
  FR: { minLength: 9, maxLength: 9 }, // France: 9 digits
  DE: { minLength: 10, maxLength: 11 }, // Germany: 10-11 digits
  CN: { minLength: 11, maxLength: 11 }, // China: 11 digits
  IN: { minLength: 10, maxLength: 10 }, // India: 10 digits
  KE: { minLength: 9, maxLength: 9 }, // Kenya: 9 digits
  UG: { minLength: 9, maxLength: 9 }, // Uganda: 9 digits
  TZ: { minLength: 9, maxLength: 9 }, // Tanzania: 9 digits
  NG: { minLength: 10, maxLength: 10 }, // Nigeria: 10 digits
  ZA: { minLength: 9, maxLength: 9 }, // South Africa: 9 digits
  AU: { minLength: 9, maxLength: 9 }, // Australia: 9 digits
  JP: { minLength: 10, maxLength: 10 }, // Japan: 10 digits
};

const DEFAULT_RULE: ValidationRule = { minLength: 7, maxLength: 15 };

/**
 * Normalize phone input: strip spaces, dashes, parentheses.
 */
function normalize(raw: string): string {
  return raw.replace(/[\s\-()]/g, '');
}

/**
 * Remove leading zero from local number (common in many countries).
 * E.g. "0788123456" → "788123456"
 */
function stripLeadingZero(digits: string): string {
  if (digits.startsWith('0')) return digits.slice(1);
  return digits;
}

/**
 * Validate and convert a phone number to E.164 format.
 *
 * @param input - Raw user input (may contain spaces, dashes, leading zero)
 * @param country - Selected country
 * @returns E.164 string (e.g. "+250788123456") or null if invalid
 */
export function validateAndFormatPhone(
  input: string,
  country: Country,
): { e164: string; error: null } | { e164: null; error: string } {
  const normalized = normalize(input);
  const digits = normalized.replace(/\D/g, ''); // Extract only digits

  if (!digits) {
    return { e164: null, error: 'Phone number is required' };
  }

  // If input already has the dial code, strip it
  let localPart = digits;
  const dialCodeDigits = country.dialCode.replace(/\D/g, '');
  if (digits.startsWith(dialCodeDigits)) {
    localPart = digits.slice(dialCodeDigits.length);
  }

  // Strip leading zero from local part
  localPart = stripLeadingZero(localPart);

  // Validate length
  const rule = COUNTRY_RULES[country.iso] ?? DEFAULT_RULE;
  if (localPart.length < rule.minLength) {
    return {
      e164: null,
      error: `Phone number must be at least ${rule.minLength} digits`,
    };
  }
  if (localPart.length > rule.maxLength) {
    return {
      e164: null,
      error: `Phone number must be at most ${rule.maxLength} digits`,
    };
  }

  // Build E.164: dial code + local part
  const e164 = `${country.dialCode}${localPart}`;
  return { e164, error: null };
}

/**
 * Quick check if input looks complete (for enabling CTA).
 * Less strict than full validation.
 */
export function isPhonePotentiallyValid(input: string, country: Country): boolean {
  const normalized = normalize(input);
  const digits = normalized.replace(/\D/g, '');
  if (!digits) return false;

  const rule = COUNTRY_RULES[country.iso] ?? DEFAULT_RULE;
  const dialCodeDigits = country.dialCode.replace(/\D/g, '');

  let localPart = digits;
  if (digits.startsWith(dialCodeDigits)) {
    localPart = digits.slice(dialCodeDigits.length);
  }
  localPart = stripLeadingZero(localPart);

  return localPart.length >= rule.minLength;
}
