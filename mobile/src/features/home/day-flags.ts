import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';

/**
 * The two facts of a kitchen's day that the chef sets by hand (Home's state inputs):
 * - deliverySkipped: no delivery to receive today ("skipped" in the spec);
 * - serviceEnded: the chef tapped End of day.
 *
 * Stored on the device per kitchen and kitchen-day, so they survive an app restart. Home's
 * state itself is never stored: it is calculated from these and the time.
 */
export interface DayFlags {
  deliverySkipped: boolean;
  serviceEnded: boolean;
}

export const NO_FLAGS: DayFlags = { deliverySkipped: false, serviceEnded: false };

/** Storage key for a kitchen's day. */
export function dayFlagsKey(kitchenId: string, day: string): string {
  return `fb.chef.day.${kitchenId}.${day}`;
}

function parseFlags(raw: string | null): DayFlags {
  if (!raw) return NO_FLAGS;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return NO_FLAGS;
    const v = value as Record<string, unknown>;
    return { deliverySkipped: v.deliverySkipped === true, serviceEnded: v.serviceEnded === true };
  } catch {
    return NO_FLAGS;
  }
}

interface DayFlagsState {
  byKey: Record<string, DayFlags>;
  /** Read a kitchen-day's flags from storage into the cache. */
  load: (kitchenId: string, day: string) => Promise<void>;
  /** Set one or both flags for a kitchen-day and persist them. */
  set: (kitchenId: string, day: string, patch: Partial<DayFlags>) => Promise<void>;
}

export const useDayFlagsStore = create<DayFlagsState>()((set, get) => ({
  byKey: {},

  load: async (kitchenId, day) => {
    const key = dayFlagsKey(kitchenId, day);
    const flags = parseFlags(await Storage.getItem(key));
    set((s) => ({ byKey: { ...s.byKey, [key]: flags } }));
  },

  set: async (kitchenId, day, patch) => {
    const key = dayFlagsKey(kitchenId, day);
    const next = { ...(get().byKey[key] ?? NO_FLAGS), ...patch };
    set((s) => ({ byKey: { ...s.byKey, [key]: next } }));
    await Storage.setItem(key, JSON.stringify(next));
  },
}));
