import { getLocales } from 'expo-localization';

/** Languages the app ships. Order = order shown in Settings. */
export const SUPPORTED_LANGUAGES = ['en', 'rw', 'fr'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** True when `code` is one of the shipped languages. */
export function isSupportedLanguage(code: string | null | undefined): code is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes((code ?? '') as SupportedLanguage);
}

/** First supported language in the device's preference list; English when none is supported. */
export function deviceLanguage(): SupportedLanguage {
  try {
    for (const locale of getLocales()) {
      const code = locale.languageCode?.toLowerCase();
      if (isSupportedLanguage(code)) return code;
    }
  } catch {
    // Locale module unavailable (e.g. tests) — fall through to English.
  }
  return 'en';
}
