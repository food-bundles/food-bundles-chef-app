import { create } from 'zustand';
import type { Kitchen } from '@/domain/models/kitchen';
import type { KitchenDto } from '@/api/kitchens-api';

function dtoToKitchen(dto: KitchenDto): Kitchen {
  return {
    id: dto.id,
    chefId: dto.chef_id,
    name: dto.name,
    address: dto.address ?? undefined,
    cuisineType: dto.location ?? undefined,
    seatingCapacity: undefined,
    isArchived: dto.status === 'archived',
    createdAt: dto.created_at,
  };
}

interface KitchenState {
  kitchens: Kitchen[];
  activeKitchen: Kitchen | null;
  setKitchens: (dtos: KitchenDto[]) => void;
  setActiveKitchen: (kitchen: Kitchen) => void;
}

export const useKitchenStore = create<KitchenState>()((set) => ({
  kitchens: [],
  activeKitchen: null,

  setKitchens: (dtos) => {
    const kitchens = dtos.map(dtoToKitchen);
    const active = kitchens.find((k) => !k.isArchived) ?? null;
    set((state) => ({
      kitchens,
      activeKitchen: state.activeKitchen
        ? (kitchens.find((k) => k.id === state.activeKitchen!.id) ?? active)
        : active,
    }));
  },

  setActiveKitchen: (kitchen) => set({ activeKitchen: kitchen }),
}));
