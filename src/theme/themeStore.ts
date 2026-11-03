import { create } from 'zustand';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightPalette, darkPalette, type ColorPalette } from './colors';

export type ThemeOverride = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'fb_theme_override';

interface ThemeState {
  override: ThemeOverride;
  systemScheme: 'light' | 'dark';
  setOverride: (override: ThemeOverride) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  override: 'system',
  systemScheme: Appearance.getColorScheme() ?? 'light',
  setOverride: (override) => {
    set({ override });
    AsyncStorage.setItem(STORAGE_KEY, override).catch(() => undefined);
  },
}));

Appearance.addChangeListener(({ colorScheme }) => {
  useThemeStore.setState({ systemScheme: colorScheme ?? 'light' });
});

export const hydrateTheme = async (): Promise<void> => {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    useThemeStore.setState({ override: stored });
  }
};

/** Resolves the active palette + dark-mode flag from the current override and system scheme. */
export const useTheme = (): { colors: ColorPalette; isDark: boolean } => {
  const override = useThemeStore((state) => state.override);
  const systemScheme = useThemeStore((state) => state.systemScheme);
  const isDark = override === 'dark' || (override === 'system' && systemScheme === 'dark');
  return { colors: isDark ? darkPalette : lightPalette, isDark };
};
