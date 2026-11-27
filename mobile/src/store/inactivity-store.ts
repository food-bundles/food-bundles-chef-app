import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const LAST_ACTIVE_KEY = 'fb.chef.last_active_at';
const INACTIVITY_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

interface InactivityState {
  lastActiveAt: number;
  isLocked: boolean;
  
  /**
   * Record current time as last activity.
   */
  recordActivity(): void;
  
  /**
   * Check if lock should be triggered and update state accordingly.
   */
  checkLockStatus(hasPasscode: boolean): void;
  
  /**
   * Manually lock the app.
   */
  lock(): void;
  
  /**
   * Unlock the app after successful passcode verification.
   */
  unlock(): void;
  
  /**
   * Load last activity time from SecureStore on app start.
   */
  loadLastActivity(): Promise<void>;
  
  /**
   * Persist last activity time to SecureStore.
   */
  persistLastActivity(): Promise<void>;
}

export const useInactivityStore = create<InactivityState>()((set, get) => ({
  lastActiveAt: Date.now(),
  isLocked: false,

  recordActivity() {
    const now = Date.now();
    set({ lastActiveAt: now });
    // Debounce persist to avoid too many writes
    void get().persistLastActivity();
  },

  checkLockStatus(hasPasscode) {
    if (!hasPasscode) {
      set({ isLocked: false });
      return;
    }

    const { lastActiveAt } = get();
    const now = Date.now();
    const timeSinceLastActive = now - lastActiveAt;

    if (timeSinceLastActive >= INACTIVITY_THRESHOLD_MS) {
      set({ isLocked: true });
    }
  },

  lock() {
    set({ isLocked: true });
  },

  unlock() {
    set({ isLocked: false, lastActiveAt: Date.now() });
    void get().persistLastActivity();
  },

  async loadLastActivity() {
    try {
      const stored = await SecureStore.getItemAsync(LAST_ACTIVE_KEY);
      if (stored) {
        const lastActiveAt = parseInt(stored, 10);
        if (!isNaN(lastActiveAt) && lastActiveAt > 0) {
          set({ lastActiveAt });
        }
      }
    } catch {
      // Ignore errors - will use current time
    }
  },

  async persistLastActivity() {
    try {
      const { lastActiveAt } = get();
      await SecureStore.setItemAsync(LAST_ACTIVE_KEY, String(lastActiveAt));
    } catch {
      // Ignore errors - not critical
    }
  },
}));
