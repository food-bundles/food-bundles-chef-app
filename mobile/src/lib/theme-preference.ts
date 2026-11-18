import * as SecureStore from 'expo-secure-store';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'fb.chef.theme_preference';

export async function getThemePreference(): Promise<ThemePreference> {
  try {
    const value = await SecureStore.getItemAsync(STORAGE_KEY);
    if (value === 'light' || value === 'dark' || value === 'system') return value;
  } catch {}
  // Product default is Light (green on white), not the device scheme.
  return 'light';
}

export async function setThemePreference(pref: ThemePreference): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, pref);
  } catch {}
}
