import type { Kitchen } from '@/domain/models/kitchen';

/** Typed repository contract for kitchen data access */
export interface KitchenRepository {
  findAll(chefId: string): Promise<Kitchen[]>;
  findById(id: string): Promise<Kitchen | null>;
  create(kitchen: Omit<Kitchen, 'id' | 'createdAt'>): Promise<Kitchen>;
  update(id: string, patch: Partial<Kitchen>): Promise<Kitchen>;
  archive(id: string): Promise<void>;
}
