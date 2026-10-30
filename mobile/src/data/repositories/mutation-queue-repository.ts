export type MutationStatus = 'pending' | 'syncing' | 'failed' | 'conflict';

export type MutationOperation =
  | 'kitchen.create'
  | 'kitchen.update'
  | 'kitchen.archive'
  | 'stock.update_quantity'
  | 'stock.update_daily_use'
  | 'sales.create'
  | 'order.submit'
  | 'order.cancel'
  | 'delivery.start'
  | 'delivery.complete'
  | 'delivery.update_line_item';

export interface QueuedMutation {
  id: string;
  kitchenId: string;
  operation: MutationOperation;
  payload: Record<string, unknown>;
  status: MutationStatus;
  retryCount: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MutationQueueRepository {
  enqueue(mutation: Omit<QueuedMutation, 'id' | 'status' | 'retryCount' | 'createdAt' | 'updatedAt'>): Promise<QueuedMutation>;
  listPending(kitchenId?: string): Promise<QueuedMutation[]>;
  listFailed(kitchenId?: string): Promise<QueuedMutation[]>;
  markSyncing(id: string): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
  markConflict(id: string, error: string): Promise<void>;
  delete(id: string): Promise<void>;
  countPending(kitchenId: string): Promise<number>;
}
