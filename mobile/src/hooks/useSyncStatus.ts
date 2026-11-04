import { useState, useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { mutationQueueRepo } from '@/data/service-container';
import { useKitchenStore } from '@/store/kitchen-store';
import { flushPendingMutations } from '@/services/sync/sync-service';

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

/** Attempt a fetch to the backend base URL to check connectivity. */
async function isReachable(): Promise<boolean> {
  try {
    const base = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:8000';
    const res = await fetch(`${base}/health`, { method: 'HEAD', signal: AbortSignal.timeout(4000) });
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
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

  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [phase, setPhase] = useState<SyncPhase>('idle');
  const isSyncing = useRef(false);

  const refresh = useCallback(async () => {
    if (!kitchenId) {
      setPendingCount(0);
      setFailedCount(0);
      setPhase('idle');
      return;
    }
    try {
      const [pending, failed] = await Promise.all([
        mutationQueueRepo.listPending(kitchenId),
        mutationQueueRepo.listFailed(kitchenId),
      ]);
      setPendingCount(pending.length);
      setFailedCount(failed.length);
      setPhase(
        failed.length > 0 ? 'failed' : pending.length > 0 ? 'pending' : 'idle'
      );
    } catch {
      // DB not yet initialized — ignore
    }
  }, [kitchenId]);

  const sync = useCallback(async () => {
    if (isSyncing.current || !kitchenId) return;
    isSyncing.current = true;
    setPhase('syncing');

    try {
      const reachable = await isReachable();
      if (!reachable) {
        await refresh();
        return;
      }
      await flushPendingMutations(kitchenId);
    } finally {
      isSyncing.current = false;
      await refresh();
    }
  }, [kitchenId, refresh]);

  // Refresh counts on mount and kitchen change
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Auto-flush when app comes to foreground
  useEffect(() => {
    const handler = (next: AppStateStatus) => {
      if (next === 'active') void sync();
    };
    const sub = AppState.addEventListener('change', handler);
    return () => sub.remove();
  }, [sync]);

  // Periodic flush every 60 seconds while pending mutations exist
  useEffect(() => {
    if (pendingCount === 0) return;
    const id = setInterval(() => void sync(), 60_000);
    return () => clearInterval(id);
  }, [pendingCount, sync]);

  return { phase, pendingCount, failedCount, sync, refresh };
}
