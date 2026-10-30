import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  MutationQueueRepository,
  QueuedMutation,
  MutationStatus,
  MutationOperation,
} from '@/data/repositories/mutation-queue-repository';
import { getDatabase } from './database';

interface MutationRow {
  id: string;
  kitchen_id: string;
  operation: string;
  payload: string;
  status: string;
  retry_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

function rowToMutation(row: MutationRow): QueuedMutation {
  return {
    id: row.id,
    kitchenId: row.kitchen_id,
    operation: row.operation as MutationOperation,
    payload: JSON.parse(row.payload) as Record<string, unknown>,
    status: row.status as MutationStatus,
    retryCount: row.retry_count,
    lastError: row.last_error ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class MutationQueueSQLiteRepository implements MutationQueueRepository {
  private db: SQLiteDatabase | null = null;

  private async getDb(): Promise<SQLiteDatabase> {
    if (!this.db) this.db = await getDatabase();
    return this.db;
  }

  async enqueue(
    mutation: Omit<QueuedMutation, 'id' | 'status' | 'retryCount' | 'createdAt' | 'updatedAt'>,
  ): Promise<QueuedMutation> {
    const db = await this.getDb();
    const id = `mut-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO mutation_queue (id, kitchen_id, operation, payload, status, retry_count, last_error, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'pending', 0, NULL, ?, ?)`,
      id,
      mutation.kitchenId,
      mutation.operation,
      JSON.stringify(mutation.payload),
      now,
      now,
    );
    return {
      ...mutation,
      id,
      status: 'pending',
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  async listPending(kitchenId?: string): Promise<QueuedMutation[]> {
    const db = await this.getDb();
    if (kitchenId) {
      const rows = await db.getAllAsync<MutationRow>(
        "SELECT * FROM mutation_queue WHERE status = 'pending' AND kitchen_id = ? ORDER BY created_at ASC",
        kitchenId,
      );
      return rows.map(rowToMutation);
    }
    const rows = await db.getAllAsync<MutationRow>(
      "SELECT * FROM mutation_queue WHERE status = 'pending' ORDER BY created_at ASC",
    );
    return rows.map(rowToMutation);
  }

  async listFailed(kitchenId?: string): Promise<QueuedMutation[]> {
    const db = await this.getDb();
    if (kitchenId) {
      const rows = await db.getAllAsync<MutationRow>(
        "SELECT * FROM mutation_queue WHERE status IN ('failed','conflict') AND kitchen_id = ? ORDER BY created_at ASC",
        kitchenId,
      );
      return rows.map(rowToMutation);
    }
    const rows = await db.getAllAsync<MutationRow>(
      "SELECT * FROM mutation_queue WHERE status IN ('failed','conflict') ORDER BY created_at ASC",
    );
    return rows.map(rowToMutation);
  }

  async markSyncing(id: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      "UPDATE mutation_queue SET status = 'syncing', updated_at = ? WHERE id = ?",
      new Date().toISOString(),
      id,
    );
  }

  async markFailed(id: string, error: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      "UPDATE mutation_queue SET status = 'failed', last_error = ?, retry_count = retry_count + 1, updated_at = ? WHERE id = ?",
      error,
      new Date().toISOString(),
      id,
    );
  }

  async markConflict(id: string, error: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      "UPDATE mutation_queue SET status = 'conflict', last_error = ?, updated_at = ? WHERE id = ?",
      error,
      new Date().toISOString(),
      id,
    );
  }

  async delete(id: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync('DELETE FROM mutation_queue WHERE id = ?', id);
  }

  async countPending(kitchenId: string): Promise<number> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM mutation_queue WHERE status = 'pending' AND kitchen_id = ?",
      kitchenId,
    );
    return row?.count ?? 0;
  }
}
