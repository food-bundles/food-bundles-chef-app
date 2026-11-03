import { create } from 'zustand';

// Stub — menu data served by useMenuItems() hook.
interface MenuState {
  // intentionally empty
}

export const useMenuStore = create<MenuState>()(() => ({}));
