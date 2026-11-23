/**
 * 04 Receive works offline: Confirm puts the receipt in the durable mutation queue
 * (SQLite) and syncs when the backend is reachable. Each queued mutation's id is the
 * server's operation_id, so a retried sync never applies the same receipt twice.
 *
 * Undo (5 s): the sync waits UNDO_SECONDS; Undo deletes the still-pending mutations.
 */
import { mutationQueueRepo } from '@/data/service-container';
import { flushPendingMutations } from '@/services/sync/sync-service';
import type { ReceivingLinePayload } from '@/domain/rules/receive';

export const UNDO_SECONDS = 5;

export interface ElsewhereItem {
  ingredientId: string;
  quantity: number;
}

/** Queue the delivery receipt and the items bought elsewhere. Returns the queued ids. */
export async function queueReceipt(
  kitchenId: string,
  orderId: string | null,
  lines: readonly ReceivingLinePayload[],
  elsewhere: readonly ElsewhereItem[],
): Promise<string[]> {
  const ids: string[] = [];
  if (orderId && lines.length > 0) {
    const m = await mutationQueueRepo.enqueue({
      kitchenId,
      operation: 'delivery.complete',
      payload: { resourceId: orderId, lines: lines.map((l) => ({ ...l })) },
    });
    ids.push(m.id);
  }
  for (const item of elsewhere) {
    const m = await mutationQueueRepo.enqueue({
      kitchenId,
      operation: 'stock.update_quantity',
      payload: {
        resourceId: '',
        ingredient_id: item.ingredientId,
        quantity: String(item.quantity),
        entry_type: 'delivery',
        notes: 'bought elsewhere',
      },
    });
    ids.push(m.id);
  }
  return ids;
}

/** Undo: drop the queued mutations that have not been sent yet. */
export async function undoReceipt(ids: readonly string[]): Promise<void> {
  const pending = new Set((await mutationQueueRepo.listPending()).map((m) => m.id));
  await Promise.all(ids.filter((id) => pending.has(id)).map((id) => mutationQueueRepo.delete(id)));
}

/** Send the queue after the undo window (best effort; the queue retries later if offline). */
export function syncAfterUndoWindow(kitchenId: string): ReturnType<typeof setTimeout> {
  return setTimeout(() => {
    void flushPendingMutations(kitchenId).catch(() => undefined);
  }, UNDO_SECONDS * 1000);
}
