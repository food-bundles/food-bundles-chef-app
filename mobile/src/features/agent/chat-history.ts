import Storage from 'expo-sqlite/kv-store';
import { z } from 'zod';
import { chatEntrySchema, type ChatEntry } from './chat-types';

/**
 * Assistant chat history, persisted per chef and per kitchen in the on-device
 * SQLite key-value store. Photos are not stored: only a `hadImage` flag survives,
 * because cached image files can be cleared by the OS.
 */
const PREFIX = 'fb.chef.chat.v1';
const MAX_SAVED_ENTRIES = 100;

/** Storage key for one kitchen's chat; empty when there is no signed-in chef or kitchen. */
export function chatKey(chefId: string, kitchenId: string): string {
  return chefId && kitchenId ? `${PREFIX}:${chefId}:${kitchenId}` : '';
}

/** Saved chat for `key`; malformed rows are dropped, a corrupt store yields an empty chat. */
export async function loadChat(key: string): Promise<ChatEntry[]> {
  if (!key) return [];
  try {
    const raw = await Storage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((row) => {
      const result = chatEntrySchema.safeParse(row);
      return result.success ? [result.data] : [];
    });
  } catch {
    return [];
  }
}

function forStorage(entry: ChatEntry): ChatEntry {
  if (entry.type === 'message' && entry.imageUri) {
    return {
      type: 'message',
      id: entry.id,
      role: entry.role,
      content: entry.content,
      hadImage: true,
      asOf: entry.asOf,
    };
  }
  if (entry.type === 'route' && entry.imageUri) {
    return { type: 'route', id: entry.id, kind: entry.kind };
  }
  return entry;
}

/** Persist the newest entries for `key`. Failures are non-fatal: the chat still works in memory. */
export async function saveChat(key: string, entries: ChatEntry[]): Promise<boolean> {
  if (!key) return false;
  try {
    const rows = entries.slice(-MAX_SAVED_ENTRIES).map(forStorage);
    await Storage.setItem(key, JSON.stringify(z.array(chatEntrySchema).parse(rows)));
    return true;
  } catch {
    return false;
  }
}

/** Delete every saved chat (all chefs and kitchens) — used on sign-out. */
export async function clearAllChats(): Promise<void> {
  try {
    const keys = await Storage.getAllKeys();
    await Storage.multiRemove(keys.filter((k) => k.startsWith(`${PREFIX}:`)));
  } catch {
    // Nothing persisted or store unavailable — nothing to clear.
  }
}
