import { translateMutations } from '@/api/sync-api';
import type { QueuedMutation } from '@/data/repositories/mutation-queue-repository';

function makeMutation(
  overrides: Partial<QueuedMutation> & { operation: QueuedMutation['operation'] }
): QueuedMutation {
  const { operation, ...rest } = overrides;
  return {
    id: 'op-' + Math.random().toString(36).slice(2),
    kitchenId: 'kitchen-abc',
    operation,
    payload: rest.payload ?? {},
    status: 'pending',
    retryCount: 0,
    createdAt: '2026-11-02T08:00:00.000Z',
    updatedAt: '2026-11-02T08:00:00.000Z',
    ...rest,
  };
}

describe('translateMutations', () => {
  describe('supported operations', () => {
    it('maps sales.create → record_sale', () => {
      const m = makeMutation({ operation: 'sales.create', payload: { menu_item_id: 'x', portions_sold: 10 } });
      const { mapped, unsupported } = translateMutations([m]);
      expect(unsupported).toHaveLength(0);
      expect(mapped).toHaveLength(1);
      expect(mapped[0]!.operation_type).toBe('record_sale');
    });

    it('maps stock.update_quantity → record_inventory', () => {
      const m = makeMutation({ operation: 'stock.update_quantity' });
      const { mapped } = translateMutations([m]);
      expect(mapped[0]!.operation_type).toBe('record_inventory');
    });

    it('maps order.submit → submit_order', () => {
      const m = makeMutation({ operation: 'order.submit' });
      const { mapped } = translateMutations([m]);
      expect(mapped[0]!.operation_type).toBe('submit_order');
    });

    it('maps delivery.complete → receive_delivery', () => {
      const m = makeMutation({ operation: 'delivery.complete' });
      const { mapped } = translateMutations([m]);
      expect(mapped[0]!.operation_type).toBe('receive_delivery');
    });

    it('maps stock.update_daily_use → record_inventory', () => {
      const m = makeMutation({ operation: 'stock.update_daily_use', payload: { entry_type: 'daily_use' } });
      const { mapped } = translateMutations([m]);
      expect(mapped[0]!.operation_type).toBe('record_inventory');
    });

    it('maps order.cancel → cancel_order', () => {
      const m = makeMutation({ operation: 'order.cancel' });
      const { mapped } = translateMutations([m]);
      expect(mapped[0]!.operation_type).toBe('cancel_order');
    });

    it('maps delivery.start → start_delivery', () => {
      const m = makeMutation({ operation: 'delivery.start' });
      const { mapped } = translateMutations([m]);
      expect(mapped[0]!.operation_type).toBe('start_delivery');
    });
  });

  describe('field mapping', () => {
    it('renames id → operation_id', () => {
      const m = makeMutation({ operation: 'sales.create', id: 'my-op-id' });
      const { mapped } = translateMutations([m]);
      expect(mapped[0]!.operation_id).toBe('my-op-id');
    });

    it('maps createdAt → queued_at', () => {
      const m = makeMutation({ operation: 'sales.create', createdAt: '2026-01-01T00:00:00.000Z' });
      const { mapped } = translateMutations([m]);
      expect(mapped[0]!.queued_at).toBe('2026-01-01T00:00:00.000Z');
    });

    it('extracts resourceId from payload into resource_id envelope field', () => {
      const m = makeMutation({
        operation: 'order.submit',
        payload: { resourceId: 'order-uuid-123', notes: 'test' },
      });
      const { mapped } = translateMutations([m]);
      expect(mapped[0]!.resource_id).toBe('order-uuid-123');
    });

    it('strips resourceId from the payload body', () => {
      const m = makeMutation({
        operation: 'order.submit',
        payload: { resourceId: 'order-uuid-123', notes: 'test' },
      });
      const { mapped } = translateMutations([m]);
      expect(mapped[0]!.payload).not.toHaveProperty('resourceId');
      expect(mapped[0]!.payload).toHaveProperty('notes', 'test');
    });

    it('uses empty string for resource_id when not in payload', () => {
      const m = makeMutation({ operation: 'sales.create', payload: {} });
      const { mapped } = translateMutations([m]);
      expect(mapped[0]!.resource_id).toBe('');
    });

    it('carries client_status from mutation status', () => {
      const m = makeMutation({ operation: 'sales.create', status: 'failed' });
      const { mapped } = translateMutations([m]);
      expect(mapped[0]!.client_status).toBe('failed');
    });
  });

  describe('unsupported operations', () => {
    const unsupportedOps: QueuedMutation['operation'][] = [
      'kitchen.create',
      'kitchen.update',
      'kitchen.archive',
      'delivery.update_line_item',
    ];

    for (const op of unsupportedOps) {
      it(`classifies ${op} as unsupported`, () => {
        const m = makeMutation({ operation: op });
        const { mapped, unsupported } = translateMutations([m]);
        expect(mapped).toHaveLength(0);
        expect(unsupported).toHaveLength(1);
        expect(unsupported[0]!.operation).toBe(op);
        expect(unsupported[0]!.id).toBe(m.id);
      });
    }
  });

  describe('mixed batch', () => {
    it('splits supported and unsupported in a mixed batch', () => {
      const mutations: QueuedMutation[] = [
        makeMutation({ operation: 'sales.create' }),
        makeMutation({ operation: 'kitchen.create' }),
        makeMutation({ operation: 'order.submit' }),
        makeMutation({ operation: 'order.cancel' }),
      ];
      const { mapped, unsupported } = translateMutations(mutations);
      expect(mapped).toHaveLength(3);
      expect(unsupported).toHaveLength(1);
    });

    it('preserves order of supported mutations', () => {
      const m1 = makeMutation({ operation: 'sales.create', id: 'first' });
      const m2 = makeMutation({ operation: 'order.submit', id: 'second' });
      const { mapped } = translateMutations([m1, m2]);
      expect(mapped[0]!.operation_id).toBe('first');
      expect(mapped[1]!.operation_id).toBe('second');
    });

    it('returns empty mapped and unsupported for empty input', () => {
      const { mapped, unsupported } = translateMutations([]);
      expect(mapped).toHaveLength(0);
      expect(unsupported).toHaveLength(0);
    });
  });
});
