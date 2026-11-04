import { request } from './http-client';
import type { MutationOperation, QueuedMutation } from '@/data/repositories/mutation-queue-repository';

// ── Backend operation types ───────────────────────────────────────────────────
// These are the exact strings the backend's OperationType literal accepts.
// Do NOT change them without a coordinated backend PR.
type BackendOperationType =
  | 'record_sale'
  | 'update_ingredient'
  | 'record_inventory'
  | 'create_order'
  | 'submit_order'
  | 'cancel_order'
  | 'receive_delivery'
  | 'start_delivery'
  | 'create_menu_item'
  | 'update_menu_item'
  | 'add_recipe_line'
  | 'update_recipe_line'
  | 'delete_recipe_line';

// ── Operation name mapping ────────────────────────────────────────────────────
// Mobile local names (dot-notation) → backend names (snake_case).
// Kitchen mutations (kitchen.create/update/archive) are NOT in this map because
// they are handled directly via the /kitchens REST endpoints, not the sync queue.
// Keep this map in sync with docs/mobile-backend-contract-matrix.md § Mutation operation names.
const OPERATION_MAP: Partial<Record<MutationOperation, BackendOperationType>> = {
  'sales.create':              'record_sale',
  'stock.update_quantity':     'record_inventory',
  // stock.update_daily_use maps to record_inventory with entry_type=daily_use
  // The payload must include entry_type: 'daily_use'
  'stock.update_daily_use':    'record_inventory',
  'order.submit':              'submit_order',
  'order.cancel':              'cancel_order',
  'delivery.start':            'start_delivery',
  'delivery.complete':         'receive_delivery',
};

// Operations that have no backend handler.
// kitchen.* are handled via direct REST endpoints, not the sync queue.
// delivery.update_line_item is deferred — requires a decision on post-receive edits.
const UNSUPPORTED_OPERATIONS: Set<MutationOperation> = new Set([
  'kitchen.create',
  'kitchen.update',
  'kitchen.archive',
  'delivery.update_line_item', // deferred (INT-053)
]);

// ── Sync request/response DTOs ────────────────────────────────────────────────

export interface SyncMutationPayload {
  operation_id: string;
  operation_type: BackendOperationType;
  resource_id: string;
  payload: Record<string, unknown>;
  queued_at: string;     // ISO datetime
  client_status: 'pending' | 'syncing' | 'failed' | 'conflict';
}

export interface SyncRequestBody {
  kitchen_id: string;
  mutations: SyncMutationPayload[];
}

export interface MutationResultDto {
  operation_id: string;
  status: 'applied' | 'skipped' | 'failed' | 'conflict';
  error_code: string | null;
  error_message: string | null;
  server_id: string | null;
}

export interface SyncResponseDto {
  kitchen_id: string;
  processed: number;
  results: MutationResultDto[];
}

// ── Translation helpers ───────────────────────────────────────────────────────

export interface UnsupportedMutation {
  id: string;
  operation: MutationOperation;
}

export interface TranslationResult {
  mapped: SyncMutationPayload[];
  /** Mutations skipped because their operation has no backend handler. */
  unsupported: UnsupportedMutation[];
}

/**
 * Translates mobile QueuedMutation objects into the backend SyncRequest payload.
 *
 * - Renames `id` → `operation_id`
 * - Maps dot-notation `operation` → snake_case `operation_type`
 * - Moves `kitchenId` to the SyncRequest wrapper (handled by caller)
 * - Maps `createdAt` → `queued_at`
 * - Strips local-only fields (retryCount, lastError, updatedAt)
 * - Separates unsupported operations into a separate list
 *
 * `resource_id` must be provided in `mutation.payload.resourceId` by the caller
 * when enqueuing mutations that target an existing resource (e.g. order_id for submit_order).
 * Mutations that create new resources should pass an empty string or a client-generated UUID.
 */
export function translateMutations(mutations: QueuedMutation[]): TranslationResult {
  const mapped: SyncMutationPayload[] = [];
  const unsupported: UnsupportedMutation[] = [];

  for (const m of mutations) {
    if (UNSUPPORTED_OPERATIONS.has(m.operation)) {
      unsupported.push({ id: m.id, operation: m.operation });
      continue;
    }

    const backendType = OPERATION_MAP[m.operation];
    if (!backendType) {
      unsupported.push({ id: m.id, operation: m.operation });
      continue;
    }

    const resourceId = typeof m.payload['resourceId'] === 'string'
      ? m.payload['resourceId']
      : '';

    // Strip resourceId from payload before sending — it is in the envelope field.
    const fullPayload = m.payload as Record<string, unknown> & { resourceId?: unknown };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { resourceId: _rid, ...payloadWithoutResourceId } = fullPayload;

    mapped.push({
      operation_id: m.id,
      operation_type: backendType,
      resource_id: resourceId,
      payload: payloadWithoutResourceId,
      queued_at: m.createdAt,
      client_status: m.status,
    });
  }

  return { mapped, unsupported };
}

// ── API call ──────────────────────────────────────────────────────────────────

/**
 * Flush a batch of mobile mutations to the backend sync endpoint.
 *
 * Caller is responsible for:
 * 1. Filtering to mutations in 'pending' or 'syncing' status
 * 2. Calling translateMutations() and handling unsupported operations before calling this
 * 3. Marking each mutation syncing before the call, then applying MutationResultDto
 * 4. Never sending more than 100 mutations per batch (backend limit)
 */
export function flushMutations(
  kitchenId: string,
  mutations: SyncMutationPayload[]
): Promise<SyncResponseDto> {
  const body: SyncRequestBody = { kitchen_id: kitchenId, mutations };
  return request<SyncResponseDto>('/sync', { method: 'POST', body });
}
