import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const LAST_ACTIVE_KEY = 'fb.chef.last_active_at';
const LOCK_COUNT_KEY = 'fb.chef.lock_count';
const SUGGESTION_SHOWN_KEY = 'fb.chef.passcode_suggestion_shown';
const INACTIVITY_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

interface InactivityState {
  lastActiveAt: number;
  isLocked: boolean;
  lockCount: number;
  suggestionShown: boolean;
  shouldShowSuggestion: boolean;
  lockedFromPath: string | null;

  /**
   * Record current time as last activity.
   */
  recordActivity(): void;

  /**
   * Check if lock should be triggered and update state accordingly.
   * @param currentPath - the current route path to restore after unlock
   */
  checkLockStatus(hasPasscode: boolean, currentPath?: string): void;

  /**
   * Manually lock the app.
   * @param currentPath - the current route path to restore after unlock
   */
  lock(currentPath?: string): void;

  /**
   * Unlock the app after successful passcode verification.
   * Returns the path to restore, or null if none saved.
   */
  unlock(): string | null;

  /**
   * Load last activity time from SecureStore on app start.
   */
  loadLastActivity(): Promise<void>;

  /**
   * Persist last activity time to SecureStore.
   */
  persistLastActivity(): Promise<void>;

  /**
   * Mark suggestion as shown so it's not displayed again.
   */
  markSuggestionShown(): void;

  /**
   * Dismiss the suggestion modal.
   */
  dismissSuggestion(): void;
}

export const useInactivityStore = create<InactivityState>()((set, get) => ({
  lastActiveAt: Date.now(),
  isLocked: false,
  lockCount: 0,
  suggestionShown: false,
  shouldShowSuggestion: false,
  lockedFromPath: null,

  recordActivity() {
    const now = Date.now();
    set({ lastActiveAt: now });
    // Debounce persist to avoid too many writes
    void get().persistLastActivity();
  },

  checkLockStatus(hasPasscode, currentPath) {
    if (!hasPasscode) {
      set({ isLocked: false });
      return;
    }

    const { lastActiveAt, lockCount, suggestionShown } = get();
    const now = Date.now();
    const timeSinceLastActive = now - lastActiveAt;

    if (timeSinceLastActive >= INACTIVITY_THRESHOLD_MS) {
      const newLockCount = lockCount + 1;
      set({
        isLocked: true,
        lockCount: newLockCount,
        lockedFromPath: currentPath || null,
        // Show suggestion after 2nd lock if not already shown
        shouldShowSuggestion: newLockCount >= 2 && !suggestionShown,
      });

      // Persist lock count
      void SecureStore.setItemAsync(LOCK_COUNT_KEY, String(newLockCount)).catch(() => {});
    }
  },

  lock(currentPath) {
    set({ isLocked: true, lockedFromPath: currentPath || null });
  },

  unlock() {
    const { lockedFromPath } = get();
    set({ isLocked: false, lastActiveAt: Date.now(), lockedFromPath: null });
    void get().persistLastActivity();
    return lockedFromPath;
  },

  async loadLastActivity() {
    try {
      const [stored, lockCountStr, suggestionShownStr] = await Promise.all([
        SecureStore.getItemAsync(LAST_ACTIVE_KEY),
        SecureStore.getItemAsync(LOCK_COUNT_KEY),
        SecureStore.getItemAsync(SUGGESTION_SHOWN_KEY),
      ]);

      let lastActiveAt = Date.now();
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed > 0) {
          lastActiveAt = parsed;
        }
      }

      let lockCount = 0;
      if (lockCountStr) {
        const parsed = parseInt(lockCountStr, 10);
        if (!isNaN(parsed) && parsed > 0) {
          lockCount = parsed;
        }
      }

      const suggestionShown = suggestionShownStr === 'true';

      set({ lastActiveAt, lockCount, suggestionShown });
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

  markSuggestionShown() {
    set({ suggestionShown: true, shouldShowSuggestion: false });
    void SecureStore.setItemAsync(SUGGESTION_SHOWN_KEY, 'true').catch(() => {});
  },

  dismissSuggestion() {
    set({ shouldShowSuggestion: false });
  },
}));
