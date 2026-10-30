import type { SalesRecord } from '@/domain/models/sales-record';

export interface SalesRepository {
  listByKitchen(kitchenId: string, fromDate?: string, toDate?: string): Promise<SalesRecord[]>;
  listByMenuItem(kitchenId: string, menuItemId: string, limit?: number): Promise<SalesRecord[]>;
  create(record: SalesRecord): Promise<SalesRecord>;
}
