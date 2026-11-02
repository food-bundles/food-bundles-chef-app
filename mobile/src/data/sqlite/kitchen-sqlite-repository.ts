import type { SQLiteDatabase } from 'expo-sqlite';
import type { Kitchen } from '@/domain/models/kitchen';
import type { KitchenRepository } from '@/data/repositories/kitchen-repository';
import { getDatabase } from './database';

interface KitchenRow {
  id: string;
  chef_id: string;
  name: string;
  address: string | null;
  cuisine_type: string | null;
  seating_capacity: number | null;
  is_archived: number;
  created_at: string;
}

function rowToKitchen(row: KitchenRow): Kitchen {
  return {
    id: row.id,
    chefId: row.chef_id,
    name: row.name,
    address: row.address ?? undefined,
    cuisineType: row.cuisine_type ?? undefined,
    seatingCapacity: row.seating_capacity ?? undefined,
    isArchived: row.is_archived === 1,
    createdAt: row.created_at,
  };
}

export class KitchenSQLiteRepository implements KitchenRepository {
  private db: SQLiteDatabase | null = null;

  private async getDb(): Promise<SQLiteDatabase> {
    if (!this.db) this.db = await getDatabase();
    return this.db;
  }

  async findAll(chefId: string): Promise<Kitchen[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<KitchenRow>(
      'SELECT * FROM kitchens WHERE chef_id = ? ORDER BY created_at ASC',
      chefId,
    );
    return rows.map(rowToKitchen);
  }

  async findById(id: string): Promise<Kitchen | null> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<KitchenRow>('SELECT * FROM kitchens WHERE id = ?', id);
    return row ? rowToKitchen(row) : null;
  }

  async create(kitchen: Omit<Kitchen, 'id' | 'createdAt'>): Promise<Kitchen> {
    const db = await this.getDb();
    const id = `kitchen-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const createdAt = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO kitchens (id, chef_id, name, address, cuisine_type, seating_capacity, is_archived, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      kitchen.chefId,
      kitchen.name,
      kitchen.address ?? null,
      kitchen.cuisineType ?? null,
      kitchen.seatingCapacity ?? null,
      kitchen.isArchived ? 1 : 0,
      createdAt,
    );
    return { ...kitchen, id, createdAt };
  }

  async update(id: string, patch: Partial<Kitchen>): Promise<Kitchen> {
    const db = await this.getDb();
    const existing = await this.findById(id);
    if (!existing) throw new Error(`Kitchen not found: ${id}`);
    const updated: Kitchen = { ...existing, ...patch };
    await db.runAsync(
      `UPDATE kitchens SET name = ?, address = ?, cuisine_type = ?, seating_capacity = ?, is_archived = ?
       WHERE id = ?`,
      updated.name,
      updated.address ?? null,
      updated.cuisineType ?? null,
      updated.seatingCapacity ?? null,
      updated.isArchived ? 1 : 0,
      id,
    );
    return updated;
  }

  async archive(id: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync('UPDATE kitchens SET is_archived = 1 WHERE id = ?', id);
  }
}
