/**
 * Sync isolation unit tests - verifies that offline queue mutations
 * are isolated by kitchenId and cannot be accidentally synced by a different chef.
 */
import type { QueuedMutation } from '@/data/repositories/mutation-queue-repository';
import { flushPendingMutations } from './sync-service';

// Mock mutation queue repository
const mockMutations: Map<string, QueuedMutation[]> = new Map();

jest.mock('@/data/service-container', () => ({
  mutationQueueRepo: {
    listPending: jest.fn((kitchenId?: string) => {
      if (kitchenId) {
        return Promise.resolve(mockMutations.get(kitchenId) ?? []);
      }
      // If no kitchenId, return all (should never happen in real code)
      const all: QueuedMutation[] = [];
      mockMutations.forEach((muts) => all.push(...muts));
      return Promise.resolve(all);
    }),
    markSyncing: jest.fn(() => Promise.resolve()),
    delete: jest.fn(() => Promise.resolve()),
    markFailed: jest.fn(() => Promise.resolve()),
    markConflict: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('@/api/sync-api', () => ({
  translateMutations: jest.fn((mutations) => ({ mapped: mutations, unsupported: [] })),
  flushMutations: jest.fn(() =>
    Promise.resolve({ results: [] })
  ),
}));

describe('Sync isolation', () => {
  beforeEach(() => {
    mockMutations.clear();
    jest.clearAllMocks();
  });

  it('only syncs mutations for the specified kitchen', async () => {
    // ChefA has kitchen1 with 2 mutations
    const kitchen1Muts: QueuedMutation[] = [
      {
        id: 'mut-1',
        kitchenId: 'kitchen-1',
        operation: 'command.create',
        payload: { dish_id: 'dish-1', qty: 2 },
        status: 'pending',
        retryCount: 0,
        createdAt: '2024-11-27T10:00:00Z',
        updatedAt: '2024-11-27T10:00:00Z',
      },
      {
        id: 'mut-2',
        kitchenId: 'kitchen-1',
        operation: 'command.action',
        payload: { command_id: 'cmd-1', action: 'served' },
        status: 'pending',
        retryCount: 0,
        createdAt: '2024-11-27T10:01:00Z',
        updatedAt: '2024-11-27T10:01:00Z',
      },
    ];

    // ChefB has kitchen2 with 1 mutation
    const kitchen2Muts: QueuedMutation[] = [
      {
        id: 'mut-3',
        kitchenId: 'kitchen-2',
        operation: 'sales.create',
        payload: { dish_id: 'dish-2', qty: 1 },
        status: 'pending',
        retryCount: 0,
        createdAt: '2024-11-27T10:02:00Z',
        updatedAt: '2024-11-27T10:02:00Z',
      },
    ];

    mockMutations.set('kitchen-1', kitchen1Muts);
    mockMutations.set('kitchen-2', kitchen2Muts);

    const { mutationQueueRepo } = await import('@/data/service-container');

    // Sync kitchen1 (ChefA's kitchen)
    await flushPendingMutations('kitchen-1');

    // Verify: listPending was called with kitchen-1
    expect(mutationQueueRepo.listPending).toHaveBeenCalledWith('kitchen-1');

    // Verify: listPending was NOT called with kitchen-2 or no argument
    expect(mutationQueueRepo.listPending).not.toHaveBeenCalledWith('kitchen-2');
    expect(mutationQueueRepo.listPending).not.toHaveBeenCalledWith();

    // Verify: only kitchen-1 mutations were marked as syncing
    const syncingCalls = (mutationQueueRepo.markSyncing as jest.Mock).mock.calls;
    expect(syncingCalls.length).toBe(2);
    expect(syncingCalls[0][0]).toBe('mut-1');
    expect(syncingCalls[1][0]).toBe('mut-2');
  });

  it('returns no_kitchen status when kitchenId is empty', async () => {
    const result = await flushPendingMutations('');
    expect(result.status).toBe('no_kitchen');

    const { mutationQueueRepo } = await import('@/data/service-container');
    expect(mutationQueueRepo.listPending).not.toHaveBeenCalled();
  });

  it('returns nothing_to_sync when no mutations exist for kitchen', async () => {
    mockMutations.set('kitchen-empty', []);

    const result = await flushPendingMutations('kitchen-empty');
    expect(result.status).toBe('nothing_to_sync');
  });
});

describe('Cross-chef isolation scenario', () => {
  it('ChefB signing in cannot sync ChefA mutations', async () => {
    // ChefA owns kitchen-1, has 2 pending mutations
    const chefAMuts: QueuedMutation[] = [
      {
        id: 'mut-a1',
        kitchenId: 'kitchen-1',
        operation: 'command.create',
        payload: {},
        status: 'pending',
        retryCount: 0,
        createdAt: '2024-11-27T10:00:00Z',
        updatedAt: '2024-11-27T10:00:00Z',
      },
      {
        id: 'mut-a2',
        kitchenId: 'kitchen-1',
        operation: 'sales.create',
        payload: {},
        status: 'pending',
        retryCount: 0,
        createdAt: '2024-11-27T10:01:00Z',
        updatedAt: '2024-11-27T10:01:00Z',
      },
    ];

    // ChefB owns kitchen-2, has 1 pending mutation
    const chefBMuts: QueuedMutation[] = [
      {
        id: 'mut-b1',
        kitchenId: 'kitchen-2',
        operation: 'order.submit',
        payload: {},
        status: 'pending',
        retryCount: 0,
        createdAt: '2024-11-27T10:02:00Z',
        updatedAt: '2024-11-27T10:02:00Z',
      },
    ];

    mockMutations.set('kitchen-1', chefAMuts);
    mockMutations.set('kitchen-2', chefBMuts);

    const { mutationQueueRepo } = await import('@/data/service-container');

    // ChefB signs in, their active kitchen is kitchen-2
    // Sync service is called with kitchen-2
    await flushPendingMutations('kitchen-2');

    // Verify: only ChefB's mutations were processed
    expect(mutationQueueRepo.listPending).toHaveBeenCalledWith('kitchen-2');
    expect(mutationQueueRepo.listPending).not.toHaveBeenCalledWith('kitchen-1');

    const syncingCalls = (mutationQueueRepo.markSyncing as jest.Mock).mock.calls;
    expect(syncingCalls.length).toBe(1);
    expect(syncingCalls[0][0]).toBe('mut-b1'); // Only ChefB's mutation

    // ChefA's mutations remain untouched in the queue (not synced, not deleted)
  });
});
