import type { SQLiteDatabase } from 'expo-sqlite';
import type { Delivery, DeliveryLineItem, DeliveryStatus } from '@/domain/models/delivery';
import type { DeliveryRepository } from '@/data/repositories/delivery-repository';
import type { QualityAssessment, PriceRecord, AcceptanceDecision } from '@/types';
import { getDatabase } from './database';

interface DeliveryRow {
  id: string;
  kitchen_id: string;
  order_id: string;
  supplier_name: string;
  status: string;
  scheduled_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

interface LineItemRow {
  id: string;
  delivery_id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  unit: string;
  ordered_quantity: number;
  accepted_quantity: number | null;
  actual_price_amount: number | null;
  actual_price_currency: string | null;
  reference_price_amount: number | null;
  reference_price_currency: string | null;
  reference_price_date: string | null;
  quality_score: number | null;
  quality_json: string | null;
  decision: string | null;
  discrepancy_reason: string | null;
  photo_uri: string | null;
}

function rowToLineItem(row: LineItemRow): DeliveryLineItem {
  const actualPrice: PriceRecord | undefined =
    row.actual_price_amount != null
      ? { amount: row.actual_price_amount, currency: row.actual_price_currency ?? 'RWF', source: 'chef-entered' }
      : undefined;
  const referencePrice: PriceRecord | undefined =
    row.reference_price_amount != null
      ? {
          amount: row.reference_price_amount,
          currency: row.reference_price_currency ?? 'RWF',
          source: 'reference',
          referenceDate: row.reference_price_date ?? undefined,
        }
      : undefined;
  const qualityAssessment: QualityAssessment | undefined =
    row.quality_json ? (JSON.parse(row.quality_json) as QualityAssessment) : undefined;

  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    productName: row.product_name,
    unit: row.unit,
    orderedQuantity: row.ordered_quantity,
    acceptedQuantity: row.accepted_quantity ?? undefined,
    actualPrice,
    referencePrice,
    qualityAssessment,
    decision: row.decision as AcceptanceDecision | undefined,
    discrepancyReason: row.discrepancy_reason ?? undefined,
    photoUri: row.photo_uri ?? undefined,
  };
}

async function loadLineItems(db: SQLiteDatabase, deliveryId: string): Promise<DeliveryLineItem[]> {
  const rows = await db.getAllAsync<LineItemRow>(
    'SELECT * FROM delivery_line_items WHERE delivery_id = ?',
    deliveryId,
  );
  return rows.map(rowToLineItem);
}

function rowToDelivery(row: DeliveryRow, lineItems: DeliveryLineItem[]): Delivery {
  return {
    id: row.id,
    kitchenId: row.kitchen_id,
    orderId: row.order_id,
    supplierName: row.supplier_name,
    status: row.status as DeliveryStatus,
    lineItems,
    scheduledAt: row.scheduled_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

export class DeliverySQLiteRepository implements DeliveryRepository {
  private db: SQLiteDatabase | null = null;

  private async getDb(): Promise<SQLiteDatabase> {
    if (!this.db) this.db = await getDatabase();
    return this.db;
  }

  async listByKitchen(kitchenId: string): Promise<Delivery[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<DeliveryRow>(
      'SELECT * FROM deliveries WHERE kitchen_id = ? ORDER BY created_at DESC',
      kitchenId,
    );
    const deliveries: Delivery[] = [];
    for (const row of rows) {
      const lineItems = await loadLineItems(db, row.id);
      deliveries.push(rowToDelivery(row, lineItems));
    }
    return deliveries;
  }

  async findById(id: string): Promise<Delivery | null> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<DeliveryRow>('SELECT * FROM deliveries WHERE id = ?', id);
    if (!row) return null;
    const lineItems = await loadLineItems(db, id);
    return rowToDelivery(row, lineItems);
  }

  async create(delivery: Delivery): Promise<Delivery> {
    const db = await this.getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO deliveries (id, kitchen_id, order_id, supplier_name, status, scheduled_at, completed_at, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        delivery.id,
        delivery.kitchenId,
        delivery.orderId,
        delivery.supplierName,
        delivery.status,
        delivery.scheduledAt ?? null,
        delivery.completedAt ?? null,
        delivery.notes ?? null,
        delivery.createdAt,
      );
      for (const item of delivery.lineItems) {
        await db.runAsync(
          `INSERT INTO delivery_line_items
           (id, delivery_id, order_id, product_id, product_name, unit, ordered_quantity,
            accepted_quantity, actual_price_amount, actual_price_currency,
            reference_price_amount, reference_price_currency, reference_price_date,
            quality_score, quality_json, decision, discrepancy_reason, photo_uri)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          item.id,
          delivery.id,
          item.orderId,
          item.productId,
          item.productName,
          item.unit,
          item.orderedQuantity,
          item.acceptedQuantity ?? null,
          item.actualPrice?.amount ?? null,
          item.actualPrice?.currency ?? null,
          item.referencePrice?.amount ?? null,
          item.referencePrice?.currency ?? null,
          item.referencePrice?.referenceDate ?? null,
          item.qualityAssessment?.score ?? null,
          item.qualityAssessment ? JSON.stringify(item.qualityAssessment) : null,
          item.decision ?? null,
          item.discrepancyReason ?? null,
          item.photoUri ?? null,
        );
      }
    });
    return delivery;
  }

  async updateStatus(id: string, status: DeliveryStatus, completedAt?: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      'UPDATE deliveries SET status = ?, completed_at = ? WHERE id = ?',
      status,
      completedAt ?? null,
      id,
    );
  }

  async updateLineItem(
    deliveryId: string,
    lineItemId: string,
    patch: Partial<DeliveryLineItem>,
  ): Promise<void> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<LineItemRow>(
      'SELECT * FROM delivery_line_items WHERE id = ? AND delivery_id = ?',
      lineItemId,
      deliveryId,
    );
    if (!row) return;

    const current = rowToLineItem(row);
    const merged = { ...current, ...patch };

    await db.runAsync(
      `UPDATE delivery_line_items SET
         accepted_quantity = ?,
         actual_price_amount = ?,
         actual_price_currency = ?,
         reference_price_amount = ?,
         reference_price_currency = ?,
         reference_price_date = ?,
         quality_score = ?,
         quality_json = ?,
         decision = ?,
         discrepancy_reason = ?,
         photo_uri = ?
       WHERE id = ? AND delivery_id = ?`,
      merged.acceptedQuantity ?? null,
      merged.actualPrice?.amount ?? null,
      merged.actualPrice?.currency ?? null,
      merged.referencePrice?.amount ?? null,
      merged.referencePrice?.currency ?? null,
      merged.referencePrice?.referenceDate ?? null,
      merged.qualityAssessment?.score ?? null,
      merged.qualityAssessment ? JSON.stringify(merged.qualityAssessment) : null,
      merged.decision ?? null,
      merged.discrepancyReason ?? null,
      merged.photoUri ?? null,
      lineItemId,
      deliveryId,
    );
  }
}
