import { mutationQueueRepo } from '@/data/service-container';
import { translateMutations, flushMutations } from '@/api/sync-api';

export type FlushResult =
  | { status: 'nothing_to_sync' }
  | { status: 'no_kitchen' }
  | { status: 'success'; applied: number; failed: number; skipped: number }
  | { status: 'error'; error: unknown };

/**
 * Flush all pending mutations for a kitchen to the backend.
 *
 * Caller responsibilities:
 * - Verify network reachability before calling.
 * - Call again on 'error' result after a backoff.
 * - Never call concurrently for the same kitchen.
 */
export async function flushPendingMutations(kitchenId: string): Promise<FlushResult> {
  if (!kitchenId) return { status: 'no_kitchen' };

  const pending = await mutationQueueRepo.listPending(kitchenId);
  if (pending.length === 0) return { status: 'nothing_to_sync' };

  // Mark all as syncing before the network call
  await Promise.all(pending.map((m) => mutationQueueRepo.markSyncing(m.id)));

  // Translate to backend format; separate unsupported operations
  const { mapped, unsupported } = translateMutations(pending);

  // Unsupported ops are permanently skipped — remove from queue
  await Promise.all(unsupported.map((u) => mutationQueueRepo.delete(u.id)));

  if (mapped.length === 0) {
    return { status: 'success', applied: 0, failed: 0, skipped: unsupported.length };
  }

  try {
    // Backend enforces max 100 mutations per batch
    const BATCH_SIZE = 100;
    let applied = 0;
    let failed = 0;

    for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
      const batch = mapped.slice(i, i + BATCH_SIZE);
      const response = await flushMutations(kitchenId, batch);

      for (const result of response.results) {
        if (result.status === 'applied' || result.status === 'skipped') {
          // Successfully processed — remove from local queue
          await mutationQueueRepo.delete(result.operation_id);
          if (result.status === 'applied') applied++;
        } else if (result.status === 'conflict') {
          await mutationQueueRepo.markConflict(
            result.operation_id,
            result.error_message ?? result.error_code ?? 'conflict'
          );
          failed++;
        } else {
          await mutationQueueRepo.markFailed(
            result.operation_id,
            result.error_message ?? result.error_code ?? 'unknown'
          );
          failed++;
        }
      }
    }

    return { status: 'success', applied, failed, skipped: unsupported.length };
  } catch (error) {
    // Network/server error — revert syncing mutations back to pending
    // (markFailed increments retryCount; we don't want that here)
    await Promise.all(
      mapped.map((m) =>
        mutationQueueRepo.markFailed(m.operation_id, 'network_error')
      )
    );
    return { status: 'error', error };
  }
}
