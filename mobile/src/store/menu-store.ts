import { create } from 'zustand';

// Stub — menu data served by useMenuItems() hook.
/** Intentionally empty: no client state lives here any more. */
type MenuState = Record<string, never>;

export const useMenuStore = create<MenuState>()(() => ({}));
