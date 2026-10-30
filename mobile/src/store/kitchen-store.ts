import { create } from 'zustand';
import type { Kitchen } from '@/domain/models/kitchen';
import { MOCK_KITCHENS } from '@/data/mock/kitchens-mock';

interface KitchenState {
  kitchens: Kitchen[];
  activeKitchen: Kitchen | null;
  setActiveKitchen: (kitchen: Kitchen) => void;
  addKitchen: (kitchen: Kitchen) => void;
  updateKitchen: (kitchenId: string, patch: Partial<Omit<Kitchen, 'id' | 'chefId' | 'createdAt'>>) => void;
  archiveKitchen: (kitchenId: string) => void;
}

/**
 * Manages kitchen selection and list.
 * Kitchen data is isolated by kitchenId — all kitchen-scoped queries
 * must filter by activeKitchen.id.
 */
export const useKitchenStore = create<KitchenState>()((set) => ({
  kitchens: MOCK_KITCHENS,
  activeKitchen: MOCK_KITCHENS[0] ?? null,

  setActiveKitchen: (kitchen) => set({ activeKitchen: kitchen }),

  addKitchen: (kitchen) =>
    set((state) => ({ kitchens: [...state.kitchens, kitchen] })),

  updateKitchen: (kitchenId, patch) =>
    set((state) => ({
      kitchens: state.kitchens.map((k) =>
        k.id === kitchenId ? { ...k, ...patch } : k,
      ),
      activeKitchen:
        state.activeKitchen?.id === kitchenId
          ? { ...state.activeKitchen, ...patch }
          : state.activeKitchen,
    })),

  archiveKitchen: (kitchenId) =>
    set((state) => ({
      kitchens: state.kitchens.map((k) =>
        k.id === kitchenId ? { ...k, isArchived: true } : k,
      ),
      activeKitchen:
        state.activeKitchen?.id === kitchenId ? null : state.activeKitchen,
    })),
}));
