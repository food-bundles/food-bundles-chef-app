/** In-memory stand-in for `expo-sqlite/kv-store` (the native SQLite module is unavailable in Jest). */
const store = new Map<string, string>();

const Storage = {
  async getItem(key: string): Promise<string | null> {
    return store.has(key) ? (store.get(key) ?? null) : null;
  },
  async setItem(key: string, value: string): Promise<void> {
    store.set(key, value);
  },
  async removeItem(key: string): Promise<void> {
    store.delete(key);
  },
  async getAllKeys(): Promise<string[]> {
    return [...store.keys()];
  },
  async multiRemove(keys: string[]): Promise<void> {
    keys.forEach((k) => store.delete(k));
  },
  async clear(): Promise<void> {
    store.clear();
  },
};

export default Storage;
export { Storage };
