/**
 * Commands data (spec 05–08). Reads come from GET /commands/today. Every change goes through
 * the durable offline queue (works during service without network; the queue's id is the
 * server's operation id, so a retry never applies twice). An in-memory overlay shows the
 * change at once until the server's list includes it.
 *
 * Accept, Served/Handed and Decline wait UNDO_SECONDS before syncing; Undo removes the queued
 * change. A new command syncs at once (it has its own confirmation screen).
 */
import { useMemo } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { create } from 'zustand';
import { useKitchenStore } from '@/store/kitchen-store';
import { useSessionStore } from '@/store/session-store';
import { mutationQueueRepo } from '@/data/service-container';
import { flushPendingMutations } from '@/services/sync/sync-service';
import {
  getCommandsToday,
  listStaff,
  type CommandAction,
  type CommandCreateBody,
  type CommandDto,
  type StaffDto,
} from '@/api/commands-api';
import type { CommandStatus } from '@/domain/rules/commands';
import { UNDO_SECONDS } from '@/features/receiving/receive-queue';
import { mergeOverlay } from './command-list';

export const commandKeys = {
  today: (chefId: string, kitchenId: string) => ['commands', 'today', chefId, kitchenId] as const,
  staff: (chefId: string, kitchenId: string) => ['commands', 'staff', chefId, kitchenId] as const,
};

interface OverlayState {
  created: CommandDto[];
  status: Record<string, CommandStatus>;
  addCreated: (command: CommandDto) => void;
  setStatus: (id: string, status: CommandStatus) => void;
  clearStatus: (id: string) => void;
  reconcile: (server: readonly CommandDto[]) => void;
}

/** Changes made on this phone that the server's list does not show yet. */
export const useCommandOverlay = create<OverlayState>()((set) => ({
  created: [],
  status: {},
  addCreated: (command) => set((s) => ({ created: [...s.created, command] })),
  setStatus: (id, status) => set((s) => ({ status: { ...s.status, [id]: status } })),
  clearStatus: (id) =>
    set((s) => {
      const next = { ...s.status };
      delete next[id];
      return { status: next };
    }),
  reconcile: (server) =>
    set((s) => {
      const byId = new Map(server.map((c) => [c.id, c]));
      const status = Object.fromEntries(
        Object.entries(s.status).filter(([id, st]) => byId.get(id)?.status !== st),
      );
      return { created: s.created.filter((c) => !byId.has(c.id)), status };
    }),
}));

/** Today's commands, counters and dishes (ordered today, can make), with local changes. */
export function useCommandsToday() {
  const chefId = useSessionStore((s) => s.chef?.id ?? '');
  const kitchenId = useKitchenStore((s) => s.activeKitchen?.id ?? '');
  const created = useCommandOverlay((s) => s.created);
  const status = useCommandOverlay((s) => s.status);
  const reconcile = useCommandOverlay((s) => s.reconcile);
  const query = useQuery({
    queryKey: commandKeys.today(chefId, kitchenId),
    queryFn: async () => {
      const today = await getCommandsToday(kitchenId);
      reconcile(today.commands);
      return today;
    },
    enabled: Boolean(chefId && kitchenId),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
  const data = useMemo(() => mergeOverlay(query.data, created, status), [query.data, created, status]);
  return { ...query, data };
}

/** The kitchen's staff for "Recorded by". */
export function useStaff() {
  const chefId = useSessionStore((s) => s.chef?.id ?? '');
  const kitchenId = useKitchenStore((s) => s.activeKitchen?.id ?? '');
  return useQuery<StaffDto[]>({
    queryKey: commandKeys.staff(chefId, kitchenId),
    queryFn: () => listStaff(kitchenId),
    enabled: Boolean(chefId && kitchenId),
    staleTime: 5 * 60_000,
  });
}

async function flushAndRefresh(kitchenId: string, qc: QueryClient): Promise<void> {
  try {
    await flushPendingMutations(kitchenId);
  } finally {
    await qc.invalidateQueries({ queryKey: ['commands'] });
    await qc.invalidateQueries({ queryKey: ['inventory'] });
  }
}

/** Queue a new command (synced at once; works offline). */
export async function queueNewCommand(
  kitchenId: string,
  body: CommandCreateBody,
  preview: CommandDto,
  qc: QueryClient,
): Promise<void> {
  await mutationQueueRepo.enqueue({
    kitchenId,
    operation: 'command.create',
    payload: { resourceId: body.id, ...body },
  });
  useCommandOverlay.getState().addCreated(preview);
  void flushAndRefresh(kitchenId, qc).catch(() => undefined);
}

export interface PendingAction {
  mutationId: string;
  commandId: string;
  timer: ReturnType<typeof setTimeout>;
}

/** Queue Accept / Decline / Served / Cancel; it syncs after the undo window. */
export async function queueCommandAction(
  kitchenId: string,
  commandId: string,
  action: CommandAction,
  optimistic: CommandStatus,
  qc: QueryClient,
): Promise<PendingAction> {
  const m = await mutationQueueRepo.enqueue({
    kitchenId,
    operation: 'command.action',
    payload: { resourceId: commandId, ...action },
  });
  useCommandOverlay.getState().setStatus(commandId, optimistic);
  const timer = setTimeout(() => {
    void flushAndRefresh(kitchenId, qc).catch(() => undefined);
  }, UNDO_SECONDS * 1000);
  return { mutationId: m.id, commandId, timer };
}

/** Undo within the window: the change is removed from the queue before it is sent. */
export async function undoCommandAction(pending: PendingAction): Promise<void> {
  clearTimeout(pending.timer);
  const still = (await mutationQueueRepo.listPending()).some((m) => m.id === pending.mutationId);
  if (still) await mutationQueueRepo.delete(pending.mutationId);
  useCommandOverlay.getState().clearStatus(pending.commandId);
}

/** React Query client for the helpers above. */
export function useCommandsClient(): QueryClient {
  return useQueryClient();
}
