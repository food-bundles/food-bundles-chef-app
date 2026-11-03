import { create } from 'zustand';
import { useLanguageStore, hydrateLanguage, type Language } from '@/i18n/languageStore';

export type { Language };
export { hydrateLanguage };

export type OrdersDemoState = 'live' | 'loading' | 'empty' | 'error';

interface UiState {
  langSheetOpen: boolean;
  ordersDemoState: OrdersDemoState;
  openLangSheet: () => void;
  closeLangSheet: () => void;
  setOrdersDemoState: (state: OrdersDemoState) => void;
}

export const useUiStore = create<UiState>((set) => ({
  langSheetOpen: false,
  ordersDemoState: 'live',
  openLangSheet: () => set({ langSheetOpen: true }),
  closeLangSheet: () => set({ langSheetOpen: false }),
  setOrdersDemoState: (state) => set({ ordersDemoState: state }),
}));

export const useLanguage = (): [Language, (language: Language) => void] => {
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  return [language, setLanguage];
};
