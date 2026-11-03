import Constants from 'expo-constants';

/**
 * Reads API base URL from Expo extra config.
 *
 * Set EXPO_PUBLIC_API_BASE_URL in your .env file (development) or via EAS
 * environment variables (CI/staging/production). Never hard-code a URL here.
 *
 * Local dev default points to your machine's loopback address.
 * On Android Emulator use 10.0.2.2 instead of localhost.
 */
function resolveBaseUrl(): string {
  // Expo SDK 49+ exposes EXPO_PUBLIC_* vars at Constants.expoConfig.extra
  const fromExtra = (Constants.expoConfig?.extra as Record<string, unknown> | undefined)
    ?.apiBaseUrl as string | undefined;

  // Also accept the build-time env var injected by Expo (EXPO_PUBLIC_ prefix).
  // Static access required by the expo/no-dynamic-env-var rule.
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;

  const url = fromExtra ?? fromEnv ?? '';

  if (!url && __DEV__) {
    // eslint-disable-next-line no-console
    console.warn(
      '[api/config] EXPO_PUBLIC_API_BASE_URL is not set. ' +
        'API calls will fail. Set it in your .env file.'
    );
  }

  // Strip trailing slash so callers can write /auth/otp/request without doubling
  return url.replace(/\/+$/, '');
}

export const API_BASE_URL = resolveBaseUrl();

/** Milliseconds before a request times out. */
export const REQUEST_TIMEOUT_MS = 20_000;
