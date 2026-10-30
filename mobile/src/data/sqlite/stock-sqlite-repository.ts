import type { SQLiteDatabase } from 'expo-sqlite';
import type { StockItem } from '@/domain/models/stock-item';
import type { StockRepository, StockMovement } from '@/data/repositories/stock-repository';
import { getDatabase } from './database';

interface StockItemRow {
  id: string;
  kitchen_id: string;
  ingredient_id: string;
  ingredient_name: string;
  unit: string;
  quantity_on_hand: number;
  daily_use_rate: number;
  last_updated: string;
}

interface StockMovementRow {
  id: string;
  kitchen_id: string;
  stock_item_id: string;
  ingredient_name: string;
  delta: number;
  reason: string;
  reference_id: string | null;
  recorded_at: string;
}

function rowToItem(row: StockItemRow): StockItem {
  return {
    id: row.id,
    kitchenId: row.kitchen_id,
    ingredientId: row.ingredient_id,
    ingredientName: row.ingredient_name,
    unit: row.unit,
    quantityOnHand: row.quantity_on_hand,
    dailyUseRate: row.daily_use_rate,
    lastUpdated: row.last_updated,
  };
}

function rowToMovement(row: StockMovementRow): StockMovement {
  return {
    id: row.id,
    kitchenId: row.kitchen_id,
    stockItemId: row.stock_item_id,
    ingredientName: row.ingredient_name,
    delta: row.delta,
    reason: row.reason as StockMovement['reason'],
    referenceId: row.reference_id ?? undefined,
    recordedAt: row.recorded_at,
  };
}

export class StockSQLiteRepository implements StockRepository {
  private db: SQLiteDatabase | null = null;

  private async getDb(): Promise<SQLiteDatabase> {
    if (!this.db) this.db = await getDatabase();
    return this.db;
  }

  async listByKitchen(kitchenId: string): Promise<StockItem[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<StockItemRow>(
      'SELECT * FROM stock_items WHERE kitchen_id = ? ORDER BY ingredient_name ASC',
      kitchenId,
    );
    return rows.map(rowToItem);
  }

  async findById(id: string): Promise<StockItem | null> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<StockItemRow>('SELECT * FROM stock_items WHERE id = ?', id);
    return row ? rowToItem(row) : null;
  }

  async upsert(item: StockItem): Promise<StockItem> {
    const db = await this.getDb();
    await db.runAsync(
      `INSERT INTO stock_items (id, kitchen_id, ingredient_id, ingredient_name, unit, quantity_on_hand, daily_use_rate, last_updated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         quantity_on_hand = excluded.quantity_on_hand,
         daily_use_rate = excluded.daily_use_rate,
         last_updated = excluded.last_updated`,
      item.id,
      item.kitchenId,
      item.ingredientId,
      item.ingredientName,
      item.unit,
      item.quantityOnHand,
      item.dailyUseRate,
      item.lastUpdated,
    );
    return item;
  }

  async updateQuantity(id: string, quantityOnHand: number): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      'UPDATE stock_items SET quantity_on_hand = ?, last_updated = ? WHERE id = ?',
      quantityOnHand,
      new Date().toISOString(),
      id,
    );
  }

  async updateDailyUseRate(id: string, dailyUseRate: number): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      'UPDATE stock_items SET daily_use_rate = ?, last_updated = ? WHERE id = ?',
      dailyUseRate,
      new Date().toISOString(),
      id,
    );
  }

  async recordMovement(movement: Omit<StockMovement, 'id'>): Promise<StockMovement> {
    const db = await this.getDb();
    const id = `mv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await db.runAsync(
      `INSERT INTO stock_movements (id, kitchen_id, stock_item_id, ingredient_name, delta, reason, reference_id, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      movement.kitchenId,
      movement.stockItemId,
      movement.ingredientName,
      movement.delta,
      movement.reason,
      movement.referenceId ?? null,
      movement.recordedAt,
    );
    return { ...movement, id };
  }

  async listMovements(kitchenId: string, stockItemId?: string, limit = 50): Promise<StockMovement[]> {
    const db = await this.getDb();
    if (stockItemId) {
      const rows = await db.getAllAsync<StockMovementRow>(
        'SELECT * FROM stock_movements WHERE kitchen_id = ? AND stock_item_id = ? ORDER BY recorded_at DESC LIMIT ?',
        kitchenId,
        stockItemId,
        limit,
      );
      return rows.map(rowToMovement);
    }
    const rows = await db.getAllAsync<StockMovementRow>(
      'SELECT * FROM stock_movements WHERE kitchen_id = ? ORDER BY recorded_at DESC LIMIT ?',
      kitchenId,
      limit,
    );
    return rows.map(rowToMovement);
  }
}
