import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import type { TokenProvider } from '@/api/http-client';

// ── Secure storage keys ──────────────────────────────────────────────────────
// Keys must be stable across app versions — never change them without migration.
const KEY_ACCESS_TOKEN = 'fb.chef.access_token';
const KEY_REFRESH_TOKEN = 'fb.chef.refresh_token';

// ── Minimal JWT payload we read client-side ──────────────────────────────────
// We only decode to get chef_id and expiry. Signature verification happens on
// the server — never trust client-decoded JWT claims for authorization.
interface JwtPayload {
  sub: string;       // chef UUID
  exp: number;       // Unix seconds
  type: 'access' | 'refresh';
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) return null;
    const padded = parts[1].padEnd(parts[1].length + ((4 - (parts[1].length % 4)) % 4), '=');
    const decoded = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}

function isTokenExpired(payload: JwtPayload): boolean {
  // Treat tokens expiring within 60 seconds as expired to prevent edge-case failures.
  return payload.exp * 1000 < Date.now() + 60_000;
}

// ── Chef profile (populated after GET /auth/me) ──────────────────────────────
export interface ChefSession {
  id: string;
  phoneNumber: string;
  name: string | null;
}

// ── Store shape ──────────────────────────────────────────────────────────────
interface SessionState {
  chef: ChefSession | null;
  isAuthenticated: boolean;
  /** True while initSession is running (before splash hide). */
  isRestoring: boolean;

  /**
   * Called at app startup. Reads tokens from SecureStore, checks expiry,
   * and restores the session if the access token is still valid.
   * Must be called before hiding the splash screen.
   */
  initSession(): Promise<void>;

  /**
   * Called after successful OTP verification + /auth/me fetch.
   * Persists tokens to SecureStore and sets the authenticated state.
   */
  signIn(params: {
    accessToken: string;
    refreshToken: string;
    chef: ChefSession;
  }): Promise<void>;

  /** Update the in-memory chef profile without touching tokens. */
  updateChef(chef: ChefSession): void;

  /** Clears local session and tokens from SecureStore. */
  signOut(): Promise<void>;

  // ── TokenProvider interface methods (used by http-client) ──────────────────

  getAccessToken(): Promise<string | null>;
  getRefreshToken(): Promise<string | null>;
  onTokensRefreshed(accessToken: string, refreshToken: string): Promise<void>;
  onAuthFailure(): Promise<void>;
}

// ── Store implementation ─────────────────────────────────────────────────────
export const useSessionStore = create<SessionState>()((set, get) => ({
  chef: null,
  isAuthenticated: false,
  isRestoring: true,

  async initSession() {
    set({ isRestoring: true });
    try {
      const [accessToken, refreshToken] = await Promise.all([
        SecureStore.getItemAsync(KEY_ACCESS_TOKEN),
        SecureStore.getItemAsync(KEY_REFRESH_TOKEN),
      ]);

      if (!accessToken || !refreshToken) {
        set({ isRestoring: false });
        return;
      }

      const payload = decodeJwtPayload(accessToken);
      if (!payload || isTokenExpired(payload)) {
        // Access token expired — http-client will refresh transparently on first call.
        // We still restore the session with chef id from the token so screens render.
        const refreshPayload = decodeJwtPayload(refreshToken);
        if (!refreshPayload || isTokenExpired(refreshPayload)) {
          // Both tokens expired — require re-login.
          await clearTokens();
          set({ isRestoring: false });
          return;
        }
      }

      // Restore minimal session from token — http-client will call GET /auth/me
      // the first time a protected screen mounts (Phase 2 feature screens).
      const chefId = payload?.sub ?? decodeJwtPayload(refreshToken)?.sub;
      if (chefId) {
        set({
          chef: { id: chefId, phoneNumber: '', name: null },
          isAuthenticated: true,
          isRestoring: false,
        });
        return;
      }
    } catch {
      // SecureStore unavailable (e.g. simulator without keychain) — not fatal.
    }
    set({ isRestoring: false });
  },

  async signIn({ accessToken, refreshToken, chef }) {
    await Promise.all([
      SecureStore.setItemAsync(KEY_ACCESS_TOKEN, accessToken),
      SecureStore.setItemAsync(KEY_REFRESH_TOKEN, refreshToken),
    ]);
    set({ chef, isAuthenticated: true });
  },

  updateChef(chef) {
    set({ chef });
  },

  async signOut() {
    await clearTokens();
    set({ chef: null, isAuthenticated: false });
  },

  // ── TokenProvider ────────────────────────────────────────────────────────

  async getAccessToken() {
    try {
      return await SecureStore.getItemAsync(KEY_ACCESS_TOKEN);
    } catch {
      return null;
    }
  },

  async getRefreshToken() {
    try {
      return await SecureStore.getItemAsync(KEY_REFRESH_TOKEN);
    } catch {
      return null;
    }
  },

  async onTokensRefreshed(accessToken, refreshToken) {
    await Promise.all([
      SecureStore.setItemAsync(KEY_ACCESS_TOKEN, accessToken),
      SecureStore.setItemAsync(KEY_REFRESH_TOKEN, refreshToken),
    ]);
    // Update chef id in case it changed (should not happen, but be safe).
    const payload = decodeJwtPayload(accessToken);
    if (payload?.sub) {
      set((s) => ({
        chef: s.chef ? { ...s.chef, id: payload.sub } : { id: payload.sub, phoneNumber: '', name: null },
        isAuthenticated: true,
      }));
    }
  },

  async onAuthFailure() {
    await get().signOut();
  },
}));

// ── TokenProvider adapter (passed to setTokenProvider at startup) ─────────────
export const sessionTokenProvider: TokenProvider = {
  getAccessToken: () => useSessionStore.getState().getAccessToken(),
  getRefreshToken: () => useSessionStore.getState().getRefreshToken(),
  onTokensRefreshed: (at, rt) => useSessionStore.getState().onTokensRefreshed(at, rt),
  onAuthFailure: () => useSessionStore.getState().onAuthFailure(),
};

async function clearTokens(): Promise<void> {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(KEY_ACCESS_TOKEN),
      SecureStore.deleteItemAsync(KEY_REFRESH_TOKEN),
    ]);
  } catch {
    // Ignore — tokens may not exist
  }
}
