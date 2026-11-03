import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'en' | 'rw' | 'fr';

const STORAGE_KEY = 'fb_language';

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: 'en',
  setLanguage: (language) => {
    set({ language });
    AsyncStorage.setItem(STORAGE_KEY, language).catch(() => undefined);
  },
}));

export const hydrateLanguage = async (): Promise<void> => {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'rw' || stored === 'fr') {
    useLanguageStore.setState({ language: stored });
  }
};
