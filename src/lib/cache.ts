import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'fb_cache_';

interface CacheEnvelope<T> {
  data: T;
  expiresAt: number;
}

/** Stores a value under `key`, expiring after `ttlMs` milliseconds. */
export async function setCache<T>(key: string, data: T, ttlMs: number): Promise<void> {
  const envelope: CacheEnvelope<T> = { data, expiresAt: Date.now() + ttlMs };
  await AsyncStorage.setItem(PREFIX + key, JSON.stringify(envelope));
}

/** Returns the cached value for `key`, or null if missing, expired, or malformed. */
export async function getCache<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(PREFIX + key);
  if (!raw) return null;

  try {
    const envelope = JSON.parse(raw) as CacheEnvelope<T>;
    if (Date.now() > envelope.expiresAt) {
      await clearCache(key);
      return null;
    }
    return envelope.data;
  } catch {
    return null;
  }
}

/** Removes a single cache entry. */
export async function clearCache(key: string): Promise<void> {
  await AsyncStorage.removeItem(PREFIX + key);
}

/** Removes every entry this module has written. */
export async function clearAllCache(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const cacheKeys = keys.filter((key) => key.startsWith(PREFIX));
  if (cacheKeys.length > 0) await AsyncStorage.multiRemove(cacheKeys);
}

/**
 * Re-runs every cached store's fetch on app foreground. Each store's own fetch()
 * already short-circuits on a fresh cache hit, so this is a cheap no-op unless an
 * entry has actually expired — dynamic imports avoid a lib -> stores import cycle.
 */
export async function refreshStaleCaches(): Promise<void> {
  const [{ useOrdersStore }, { useWalletStore }] = await Promise.all([
    import('@/stores/ordersStore'),
    import('@/stores/walletStore'),
  ]);
  await Promise.all([useOrdersStore.getState().fetch(), useWalletStore.getState().fetch()]);
}
