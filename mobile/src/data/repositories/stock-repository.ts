import type { StockItem } from '@/domain/models/stock-item';

export interface StockMovement {
  id: string;
  kitchenId: string;
  stockItemId: string;
  ingredientName: string;
  /** Positive = added, negative = consumed */
  delta: number;
  reason: 'delivery' | 'manual_adjustment' | 'opening_count' | 'daily_use';
  referenceId?: string;
  recordedAt: string;
}

export interface StockRepository {
  listByKitchen(kitchenId: string): Promise<StockItem[]>;
  findById(id: string): Promise<StockItem | null>;
  upsert(item: StockItem): Promise<StockItem>;
  updateQuantity(id: string, quantityOnHand: number): Promise<void>;
  updateDailyUseRate(id: string, dailyUseRate: number): Promise<void>;
  recordMovement(movement: Omit<StockMovement, 'id'>): Promise<StockMovement>;
  listMovements(kitchenId: string, stockItemId?: string, limit?: number): Promise<StockMovement[]>;
}
