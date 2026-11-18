import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, useColorScheme as useRNColorScheme } from 'react-native';
import { getThemePreference, setThemePreference, type ThemePreference } from '@/lib/theme-preference';
import { darkTheme, lightTheme, type ThemeTokens } from '@/lib/theme';

interface ThemeContextValue {
  preference: ThemePreference;
  colorScheme: 'light' | 'dark';
  tokens: ThemeTokens;
  setPreference: (pref: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  preference: 'light',
  colorScheme: 'light',
  tokens: lightTheme,
  setPreference: async () => {},
});

/**
 * Applies the preference to Appearance so NativeWind `dark:` classes and
 * `useColorScheme()` follow it. 'unspecified' hands control back to the device.
 */
function applyPreference(pref: ThemePreference) {
  Appearance.setColorScheme(pref === 'system' ? 'unspecified' : pref);
}

/** Theme preference (light/dark/system) plus the resolved scheme. */
export function useThemePreference() {
  return useContext(ThemeContext);
}

/** Semantic colour tokens for the active scheme. */
export function useTheme(): ThemeTokens {
  return useContext(ThemeContext).tokens;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('light');
  const [loaded, setLoaded] = useState(false);
  const deviceScheme = useRNColorScheme();

  useEffect(() => {
    void getThemePreference().then((pref) => {
      applyPreference(pref);
      setPreferenceState(pref);
      setLoaded(true);
    });
  }, []);

  const setPreference = useCallback(async (pref: ThemePreference) => {
    applyPreference(pref);
    setPreferenceState(pref);
    await setThemePreference(pref);
  }, []);

  const colorScheme: 'light' | 'dark' =
    preference === 'system' ? (deviceScheme === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo(
    () => ({ preference, colorScheme, tokens: colorScheme === 'dark' ? darkTheme : lightTheme, setPreference }),
    [preference, colorScheme, setPreference],
  );

  // Hold rendering until the saved preference is applied, so there is no flash of the wrong theme.
  if (!loaded) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
