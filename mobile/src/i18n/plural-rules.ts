/**
 * Minimal `Intl.PluralRules` for the app's languages, installed ONLY when the JS
 * engine does not provide one (some Hermes builds ship without it). i18next needs
 * it to pick `key_one` / `key_other`; without it, it silently falls back to the
 * old v3 plural format and every `_one/_other` key breaks.
 *
 * Rules (CLDR cardinal): en and rw → "one" for exactly 1; fr → "one" for 0 ≤ n < 2.
 */
export type PluralCategory = 'one' | 'other';

/** Plural category of `n` in `language` (two-letter code). */
export function pluralCategory(language: string, n: number): PluralCategory {
  const abs = Math.abs(n);
  if (language === 'fr') return abs < 2 ? 'one' : 'other';
  return abs === 1 ? 'one' : 'other';
}

class PluralRulesShim {
  private readonly language: string;

  constructor(locales?: string | readonly string[]) {
    const tag = typeof locales === 'string' ? locales : locales?.[0];
    this.language = (tag ?? 'en').slice(0, 2).toLowerCase();
  }

  select(n: number): PluralCategory {
    return pluralCategory(this.language, n);
  }

  resolvedOptions(): { locale: string; pluralCategories: PluralCategory[]; type: 'cardinal' } {
    return { locale: this.language, pluralCategories: ['one', 'other'], type: 'cardinal' };
  }

  static supportedLocalesOf(locales: string | readonly string[]): string[] {
    return typeof locales === 'string' ? [locales] : [...locales];
  }
}

/** Installs the shim when `Intl.PluralRules` is missing. Returns true when it did. */
export function installPluralRulesIfMissing(): boolean {
  const scope = globalThis as { Intl?: Record<string, unknown> };
  if (scope.Intl && typeof scope.Intl.PluralRules === 'function') return false;
  if (!scope.Intl) scope.Intl = {};
  Object.defineProperty(scope.Intl, 'PluralRules', { value: PluralRulesShim, configurable: true, writable: true });
  return true;
}

installPluralRulesIfMissing();
