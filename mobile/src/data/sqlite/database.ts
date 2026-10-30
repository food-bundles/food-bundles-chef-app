import * as SQLite from 'expo-sqlite';

/**
 * Schema version. Increment this when adding a new migration.
 * Never decrement or reuse a version number.
 */
const SCHEMA_VERSION = 1;

const MIGRATIONS: Record<number, string[]> = {
  1: [
    `CREATE TABLE IF NOT EXISTS kitchens (
      id TEXT PRIMARY KEY NOT NULL,
      chef_id TEXT NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      cuisine_type TEXT,
      seating_capacity INTEGER,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS ingredients (
      id TEXT PRIMARY KEY NOT NULL,
      kitchen_id TEXT NOT NULL,
      name TEXT NOT NULL,
      unit TEXT NOT NULL,
      category TEXT,
      sku TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY NOT NULL,
      kitchen_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      price_rwf REAL NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS sales_records (
      id TEXT PRIMARY KEY NOT NULL,
      kitchen_id TEXT NOT NULL,
      menu_item_id TEXT NOT NULL,
      menu_item_name TEXT NOT NULL,
      date TEXT NOT NULL,
      portions_sold INTEGER NOT NULL,
      price_rwf REAL NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS stock_items (
      id TEXT PRIMARY KEY NOT NULL,
      kitchen_id TEXT NOT NULL,
      ingredient_id TEXT NOT NULL,
      ingredient_name TEXT NOT NULL,
      unit TEXT NOT NULL,
      quantity_on_hand REAL NOT NULL DEFAULT 0,
      daily_use_rate REAL NOT NULL DEFAULT 0,
      last_updated TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY NOT NULL,
      kitchen_id TEXT NOT NULL,
      stock_item_id TEXT NOT NULL,
      ingredient_name TEXT NOT NULL,
      delta REAL NOT NULL,
      reason TEXT NOT NULL,
      reference_id TEXT,
      recorded_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY NOT NULL,
      kitchen_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      total_rwf REAL NOT NULL DEFAULT 0,
      placed_at TEXT,
      expected_delivery_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS order_line_items (
      id TEXT PRIMARY KEY NOT NULL,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      unit TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price_rwf REAL NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS deliveries (
      id TEXT PRIMARY KEY NOT NULL,
      kitchen_id TEXT NOT NULL,
      order_id TEXT NOT NULL,
      supplier_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      scheduled_at TEXT,
      completed_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS delivery_line_items (
      id TEXT PRIMARY KEY NOT NULL,
      delivery_id TEXT NOT NULL,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      unit TEXT NOT NULL,
      ordered_quantity REAL NOT NULL,
      accepted_quantity REAL,
      actual_price_amount REAL,
      actual_price_currency TEXT,
      reference_price_amount REAL,
      reference_price_currency TEXT,
      reference_price_date TEXT,
      quality_score INTEGER,
      quality_json TEXT,
      decision TEXT,
      discrepancy_reason TEXT,
      photo_uri TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS mutation_queue (
      id TEXT PRIMARY KEY NOT NULL,
      kitchen_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
  ],
};

let _db: SQLite.SQLiteDatabase | null = null;

/**
 * Opens (or returns the cached) SQLite database and runs pending migrations.
 * Safe to call multiple times — migrations are idempotent.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;

  const db = await SQLite.openDatabaseAsync('food-bundles-chef.db');
  await runMigrations(db);
  _db = db;
  return db;
}

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  // Create version table if not exists
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER NOT NULL
    )
  `);

  const row = await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1',
  );
  const currentVersion = row?.version ?? 0;

  for (let v = currentVersion + 1; v <= SCHEMA_VERSION; v++) {
    const stmts = MIGRATIONS[v];
    if (!stmts) continue;

    await db.withTransactionAsync(async () => {
      for (const sql of stmts) {
        await db.execAsync(sql);
      }
      await db.runAsync(
        currentVersion === 0
          ? 'INSERT INTO schema_version (version) VALUES (?)'
          : 'UPDATE schema_version SET version = ?',
        v,
      );
    });
  }
}

/** Reset the cached connection (for testing) */
export function resetDatabaseForTesting(): void {
  _db = null;
}
