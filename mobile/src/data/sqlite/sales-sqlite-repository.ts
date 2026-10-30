import type { SQLiteDatabase } from 'expo-sqlite';
import type { SalesRecord } from '@/domain/models/sales-record';
import type { SalesRepository } from '@/data/repositories/sales-repository';
import { getDatabase } from './database';

interface SalesRow {
  id: string;
  kitchen_id: string;
  menu_item_id: string;
  menu_item_name: string;
  date: string;
  portions_sold: number;
  price_rwf: number;
}

function rowToRecord(row: SalesRow): SalesRecord {
  return {
    id: row.id,
    kitchenId: row.kitchen_id,
    menuItemId: row.menu_item_id,
    menuItemName: row.menu_item_name,
    date: row.date,
    portionsSold: row.portions_sold,
    priceRwf: row.price_rwf,
  };
}

export class SalesSQLiteRepository implements SalesRepository {
  private db: SQLiteDatabase | null = null;

  private async getDb(): Promise<SQLiteDatabase> {
    if (!this.db) this.db = await getDatabase();
    return this.db;
  }

  async listByKitchen(kitchenId: string, fromDate?: string, toDate?: string): Promise<SalesRecord[]> {
    const db = await this.getDb();
    if (fromDate && toDate) {
      const rows = await db.getAllAsync<SalesRow>(
        'SELECT * FROM sales_records WHERE kitchen_id = ? AND date >= ? AND date <= ? ORDER BY date DESC',
        kitchenId,
        fromDate,
        toDate,
      );
      return rows.map(rowToRecord);
    }
    const rows = await db.getAllAsync<SalesRow>(
      'SELECT * FROM sales_records WHERE kitchen_id = ? ORDER BY date DESC',
      kitchenId,
    );
    return rows.map(rowToRecord);
  }

  async listByMenuItem(kitchenId: string, menuItemId: string, limit = 28): Promise<SalesRecord[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<SalesRow>(
      'SELECT * FROM sales_records WHERE kitchen_id = ? AND menu_item_id = ? ORDER BY date DESC LIMIT ?',
      kitchenId,
      menuItemId,
      limit,
    );
    return rows.map(rowToRecord);
  }

  async create(record: SalesRecord): Promise<SalesRecord> {
    const db = await this.getDb();
    await db.runAsync(
      `INSERT INTO sales_records (id, kitchen_id, menu_item_id, menu_item_name, date, portions_sold, price_rwf)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      record.id,
      record.kitchenId,
      record.menuItemId,
      record.menuItemName,
      record.date,
      record.portionsSold,
      record.priceRwf,
    );
    return record;
  }
}
