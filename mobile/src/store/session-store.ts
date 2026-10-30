import { create } from 'zustand';

export interface Chef {
  id: string;
  phone: string;
}

interface SessionState {
  chef: Chef | null;
  isAuthenticated: boolean;
  signIn: (chef: Chef) => void;
  signOut: () => void;
}

/**
 * Manages the authenticated chef session.
 * In this UI-only implementation, state is held in memory.
 * Production implementation should persist via expo-secure-store.
 */
export const useSessionStore = create<SessionState>()((set) => ({
  chef: null,
  isAuthenticated: false,

  signIn: (chef) => set({ chef, isAuthenticated: true }),

  signOut: () => set({ chef: null, isAuthenticated: false }),
}));
