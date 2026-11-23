import { create } from 'zustand';
import type { Kitchen } from '@/domain/models/kitchen';
import type { KitchenDto } from '@/api/kitchens-api';

/** The spec's sample service hours, used when the server sends none. */
export const DEFAULT_OPENING_TIME = '11:00';
export const DEFAULT_CLOSING_TIME = '22:00';

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
    currency: dto.currency,
    timezone: dto.timezone,
    country: dto.country,
    catalogAvailable: dto.catalog_available,
    conversionEnabled: dto.conversion_enabled ?? false,
    openingTime: (dto.opening_time ?? DEFAULT_OPENING_TIME).slice(0, 5),
    closingTime: (dto.closing_time ?? DEFAULT_CLOSING_TIME).slice(0, 5),
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
