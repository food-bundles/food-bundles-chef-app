import { useEffect } from 'react';
import { kitchenRepo, stockRepo, deliveryRepo } from '@/data/service-container';
import { useKitchenStore } from '@/store/kitchen-store';
import { useStockStore } from '@/store/stock-store';
import { useSalesStore } from '@/store/sales-store';
import { useDeliveryStore } from '@/store/delivery-store';
import { MOCK_KITCHENS } from '@/data/mock/kitchens-mock';
import { MOCK_STOCK } from '@/data/mock/stock-mock';
import { MOCK_SALES } from '@/data/mock/sales-mock';
import { MOCK_DELIVERIES } from '@/data/mock/deliveries-mock';
import { getDatabase } from '@/data/sqlite/database';

const SEED_FLAG_KEY = 'mock_data_seeded_v1';

async function isMockDataSeeded(): Promise<boolean> {
  const db = await getDatabase();
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS app_flags (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
  );
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM app_flags WHERE key = ?`,
    SEED_FLAG_KEY,
  );
  return row?.value === '1';
}

async function markMockDataSeeded(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO app_flags (key, value) VALUES (?, '1')`,
    SEED_FLAG_KEY,
  );
}

async function seedMockData(): Promise<void> {
  const db = await getDatabase();

  for (const k of MOCK_KITCHENS) {
    await db.runAsync(
      `INSERT OR IGNORE INTO kitchens
       (id, chef_id, name, address, cuisine_type, seating_capacity, is_archived, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      k.id, k.chefId, k.name, k.address ?? null, k.cuisineType ?? null,
      k.seatingCapacity ?? null, k.isArchived ? 1 : 0, k.createdAt,
    );
  }

  for (const item of MOCK_STOCK) {
    try { await stockRepo.upsert(item); } catch { /* ignore */ }
  }

  for (const record of MOCK_SALES) {
    await db.runAsync(
      `INSERT OR IGNORE INTO sales_records
       (id, kitchen_id, menu_item_id, menu_item_name, date, portions_sold, price_rwf)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      record.id, record.kitchenId, record.menuItemId, record.menuItemName,
      record.date, record.portionsSold, record.priceRwf,
    );
  }

  for (const delivery of MOCK_DELIVERIES) {
    try { await deliveryRepo.create(delivery); } catch { /* ignore */ }
  }
}

/**
 * Hydrates Zustand stores from SQLite on app mount.
 * On first launch, seeds SQLite from mock data, then loads into stores.
 * On subsequent launches, loads directly from SQLite — mutations during
 * the session are written through to SQLite by each store action.
 *
 * Must be called once in the root layout, after the database is open.
 */
export function useDataHydration(): void {
  const setStockItems = useStockStore((s) => s.setItems);
  const setSalesRecords = useSalesStore((s) => s.setRecords);
  const setDeliveries = useDeliveryStore((s) => s.setDeliveries);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const seeded = await isMockDataSeeded();
        if (!seeded) {
          await seedMockData();
          await markMockDataSeeded();
        }

        const chefId = 'chef-0788000001';
        const kitchens = await kitchenRepo.findAll(chefId);

        if (!cancelled && kitchens.length > 0) {
          useKitchenStore.setState({
            kitchens,
            activeKitchen: kitchens.find((k) => !k.isArchived) ?? null,
          });
        }

        if (!kitchens.length) return;

        const allKitchenIds = kitchens.map((k) => k.id);
        const [allStock, allDeliveries] = await Promise.all([
          Promise.all(allKitchenIds.map((id) => stockRepo.listByKitchen(id))).then((r) => r.flat()),
          Promise.all(allKitchenIds.map((id) => deliveryRepo.listByKitchen(id))).then((r) => r.flat()),
        ]);

        // Sales: load from SQLite via direct query
        const db = await getDatabase();
        type SalesRow = {
          id: string; kitchen_id: string; menu_item_id: string;
          menu_item_name: string; date: string; portions_sold: number; price_rwf: number;
        };
        const salesRows = await db.getAllAsync<SalesRow>(
          `SELECT * FROM sales_records WHERE kitchen_id IN (${allKitchenIds.map(() => '?').join(',')}) ORDER BY date DESC`,
          ...allKitchenIds,
        );
        const allSales = salesRows.map((r) => ({
          id: r.id, kitchenId: r.kitchen_id, menuItemId: r.menu_item_id,
          menuItemName: r.menu_item_name, date: r.date,
          portionsSold: r.portions_sold, priceRwf: r.price_rwf,
        }));

        if (!cancelled) {
          if (allStock.length > 0) setStockItems(allStock);
          if (allSales.length > 0) setSalesRecords(allSales);
          if (allDeliveries.length > 0) setDeliveries(allDeliveries);
        }
      } catch (e) {
        // SQLite unavailable — keep mock data in stores
        if (__DEV__) console.warn('[useDataHydration] SQLite unavailable, using mock data:', e);
      }
    }

    void hydrate();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
