import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { mutationQueueRepo } from '@/data/service-container';
import { useKitchenStore } from '@/store/kitchen-store';
import { flushPendingMutations } from '@/services/sync/sync-service';
import { API_BASE_URL } from '@/api/config';

export type SyncPhase = 'idle' | 'pending' | 'syncing' | 'failed' | 'conflict';

export interface SyncStatus {
  phase: SyncPhase;
  pendingCount: number;
  failedCount: number;
  /** Manually trigger a sync flush. */
  sync: () => Promise<void>;
  /** Refresh counts from the DB without flushing. */
  refresh: () => Promise<void>;
}

interface QueueCounts {
  /** Kitchen the counts belong to (counts of another kitchen are never shown). */
  kitchenId: string;
  pending: number;
  failed: number;
}

/** Attempt a fetch to the backend base URL to check connectivity. */
async function isReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { method: 'HEAD', signal: AbortSignal.timeout(4000) });
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

async function readCounts(kitchenId: string): Promise<QueueCounts> {
  const [pending, failed] = await Promise.all([
    mutationQueueRepo.listPending(kitchenId),
    mutationQueueRepo.listFailed(kitchenId),
  ]);
  return { kitchenId, pending: pending.length, failed: failed.length };
}

/**
 * Polls the local mutation queue and auto-flushes to the backend when online.
 *
 * Auto-flush triggers:
 * - App foreground transition (AppState active)
 * - Every 60 seconds while app is active and there are pending mutations
 */
export function useSyncStatus(): SyncStatus {
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const kitchenId = activeKitchen?.id ?? '';

  const [counts, setCounts] = useState<QueueCounts | null>(null);
  const [syncing, setSyncing] = useState(false);
  const isSyncing = useRef(false);

  const refresh = useCallback(async () => {
    if (!kitchenId) return;
    try {
      setCounts(await readCounts(kitchenId));
    } catch {
      // DB not yet initialized — counts stay as they are.
    }
  }, [kitchenId]);

  const sync = useCallback(async () => {
    if (isSyncing.current || !kitchenId) return;
    isSyncing.current = true;
    setSyncing(true);
    try {
      if (await isReachable()) await flushPendingMutations(kitchenId);
    } finally {
      isSyncing.current = false;
      setSyncing(false);
      await refresh();
    }
  }, [kitchenId, refresh]);

  // Load counts on mount and whenever the kitchen changes.
  useEffect(() => {
    if (!kitchenId) return;
    let active = true;
    readCounts(kitchenId)
      .then((next) => {
        if (active) setCounts(next);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [kitchenId]);

  // Auto-flush when app comes to foreground
  useEffect(() => {
    const handler = (next: AppStateStatus) => {
      if (next === 'active') void sync();
    };
    const sub = AppState.addEventListener('change', handler);
    return () => sub.remove();
  }, [sync]);

  const current = counts !== null && counts.kitchenId === kitchenId;
  const pendingCount = current ? counts.pending : 0;
  const failedCount = current ? counts.failed : 0;

  // Periodic flush every 60 seconds while pending mutations exist
  useEffect(() => {
    if (pendingCount === 0) return;
    const id = setInterval(() => void sync(), 60_000);
    return () => clearInterval(id);
  }, [pendingCount, sync]);

  const phase: SyncPhase = syncing ? 'syncing' : failedCount > 0 ? 'failed' : pendingCount > 0 ? 'pending' : 'idle';
  return { phase, pendingCount, failedCount, sync, refresh };
}
