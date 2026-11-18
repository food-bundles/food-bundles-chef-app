// Must run before i18next initialises: it decides the plural format from Intl.PluralRules.
import './plural-rules';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { deviceLanguage } from './device-language';
import { resources } from './resources';

/**
 * i18next configuration for Food Bundles Chef App: English, Kinyarwanda, French.
 * Starts in the device language (or English); the chef's saved choice is applied
 * at startup by `restoreLanguage()` in app/_layout.tsx. Plurals use `_one` / `_other`.
 */
void i18n.use(initReactI18next).init({
  resources,
  lng: deviceLanguage(),
  fallbackLng: 'en',
  supportedLngs: ['en', 'fr', 'rw'],
  interpolation: {
    // React Native renders text, not HTML — nothing to escape.
    escapeValue: false,
  },
});

export default i18n;
