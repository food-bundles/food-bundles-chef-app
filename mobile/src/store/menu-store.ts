import { create } from 'zustand';
import type { MenuItem } from '@/domain/models/menu-item';
import { MOCK_MENU_ITEMS } from '@/data/mock/menu-mock';

interface MenuState {
  items: MenuItem[];
  addItem: (item: MenuItem) => void;
  updateItem: (id: string, patch: Partial<Omit<MenuItem, 'id' | 'kitchenId' | 'createdAt'>>) => void;
  toggleActive: (id: string) => void;
}

export const useMenuStore = create<MenuState>()((set) => ({
  items: MOCK_MENU_ITEMS,

  addItem: (item) => set((s) => ({ items: [...s.items, item] })),

  updateItem: (id, patch) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    })),

  toggleActive: (id) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, isActive: !i.isActive } : i)),
    })),
}));
