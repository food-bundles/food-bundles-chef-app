import { useState, useCallback, useEffect } from 'react';
import { mutationQueueRepo } from '@/data/service-container';
import { useKitchenStore } from '@/store/kitchen-store';

export type SyncPhase = 'idle' | 'pending' | 'syncing' | 'failed' | 'conflict';

export interface SyncStatus {
  phase: SyncPhase;
  pendingCount: number;
  failedCount: number;
  /** Refresh counts from the DB */
  refresh: () => Promise<void>;
}

/**
 * Polls the mutation queue for the active kitchen and returns sync status.
 * Phase 07: local-only mode — mutations are queued but never flushed to a server.
 * When a real backend is added, this hook calls the flush logic.
 */
export function useSyncStatus(): SyncStatus {
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const kitchenId = activeKitchen?.id ?? '';

  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!kitchenId) {
      setPendingCount(0);
      setFailedCount(0);
      return;
    }
    try {
      const [pending, failed] = await Promise.all([
        mutationQueueRepo.listPending(kitchenId),
        mutationQueueRepo.listFailed(kitchenId),
      ]);
      setPendingCount(pending.length);
      setFailedCount(failed.length);
    } catch {
      // DB not yet initialized — ignore
    }
  }, [kitchenId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const phase: SyncPhase =
    failedCount > 0
      ? 'failed'
      : pendingCount > 0
      ? 'pending'
      : 'idle';

  return { phase, pendingCount, failedCount, refresh };
}
