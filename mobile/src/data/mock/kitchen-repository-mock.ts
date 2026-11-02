import type { KitchenRepository } from '@/data/repositories/kitchen-repository';
import type { Kitchen } from '@/domain/models/kitchen';
import { MOCK_KITCHENS } from './kitchens-mock';

/** In-memory mock implementation of KitchenRepository for UI-only development */
export function createMockKitchenRepository(): KitchenRepository {
  let kitchens: Kitchen[] = [...MOCK_KITCHENS];

  return {
    async findAll(chefId: string) {
      return kitchens.filter((k) => k.chefId === chefId && !k.isArchived);
    },

    async findById(id: string) {
      return kitchens.find((k) => k.id === id) ?? null;
    },

    async create(input) {
      const kitchen: Kitchen = {
        ...input,
        id: `kitchen-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      kitchens = [...kitchens, kitchen];
      return kitchen;
    },

    async update(id, patch) {
      const index = kitchens.findIndex((k) => k.id === id);
      if (index === -1) throw new Error(`Kitchen ${id} not found`);
      const updated = { ...kitchens[index]!, ...patch };
      kitchens = kitchens.map((k, i) => (i === index ? updated : k));
      return updated;
    },

    async archive(id) {
      kitchens = kitchens.map((k) => (k.id === id ? { ...k, isArchived: true } : k));
    },
  };
}
