import { en, type TranslationKey } from './en';
import { rw } from './rw';
import { fr } from './fr';
import { useLanguageStore } from './languageStore';

const tables = { en, rw, fr } as const;

type Vars = Record<string, string | number>;

const interpolate = (template: string, vars?: Vars): string => {
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replace(`{{${key}}}`, String(value)),
    template,
  );
};

export const useT = () => {
  const language = useLanguageStore((state) => state.language);
  const table = tables[language];
  return (key: TranslationKey, vars?: Vars): string => interpolate(table[key], vars);
};

/** Non-hook translator for use outside components (e.g. background tasks). */
export const translate = (key: TranslationKey, vars?: Vars): string => {
  const table = tables[useLanguageStore.getState().language];
  return interpolate(table[key], vars);
};
