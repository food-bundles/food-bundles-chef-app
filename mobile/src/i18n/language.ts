import * as SecureStore from 'expo-secure-store';
import i18n from './index';
import {
  deviceLanguage,
  isSupportedLanguage,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from './device-language';

export { deviceLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage };

/** Each language's name in that language (never translated). */
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  rw: 'Kinyarwanda',
  fr: 'Français',
};

const LANGUAGE_KEY = 'fb.chef.language';

/** The chef's saved choice, or null when they never picked one (device default applies). */
export async function savedLanguage(): Promise<SupportedLanguage | null> {
  try {
    const value = await SecureStore.getItemAsync(LANGUAGE_KEY);
    return isSupportedLanguage(value) ? value : null;
  } catch {
    return null;
  }
}

/** Apply the saved language (or the device default) at startup. */
export async function restoreLanguage(): Promise<void> {
  const lang = (await savedLanguage()) ?? deviceLanguage();
  if (lang !== i18n.language) await i18n.changeLanguage(lang);
}

/** Switch language instantly and remember it. */
export async function setAppLanguage(lang: SupportedLanguage): Promise<void> {
  await i18n.changeLanguage(lang);
  try {
    await SecureStore.setItemAsync(LANGUAGE_KEY, lang);
  } catch {
    // Not persisted; the choice still applies until the app restarts.
  }
}

/** Current app language as a supported code. */
export function currentLanguage(): SupportedLanguage {
  const base = (i18n.language ?? 'en').slice(0, 2).toLowerCase();
  return isSupportedLanguage(base) ? base : 'en';
}
