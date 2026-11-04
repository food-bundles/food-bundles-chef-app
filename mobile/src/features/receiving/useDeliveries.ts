import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSessionStore } from '@/store/session-store';
import { useKitchenStore } from '@/store/kitchen-store';
import { queryKeys } from '@/api/query-keys';
import { listOrders, getOrder } from '@/api/orders-api';
import { startDelivery, receiveDelivery } from '@/api/receiving-api';
import type { OrderDto, OrderWithLinesDto } from '@/api/orders-api';
import type { BulkReceivingBody } from '@/api/receiving-api';

function useReceivingContext() {
  const chefId = useSessionStore((s) => s.chef?.id ?? '');
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  return { chefId, kitchenId: activeKitchen?.id ?? '' };
}

// Delivery-relevant order statuses — submitted is included so a chef can
// start receiving even when a supplier skips the "confirmed" step.
const DELIVERY_STATUSES = new Set(['submitted', 'confirmed', 'out_for_delivery', 'delivered']);

/** Returns orders that are confirmed, out for delivery, or recently delivered. */
export function useDeliveries() {
  const { chefId, kitchenId } = useReceivingContext();
  const enabled = Boolean(chefId && kitchenId);

  return useQuery<OrderDto[]>({
    queryKey: queryKeys.deliveries.list(chefId, kitchenId),
    queryFn: async () => {
      const all = await listOrders(kitchenId);
      return all.filter((o) => DELIVERY_STATUSES.has(o.status));
    },
    enabled,
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useDeliveryDetail(orderId: string) {
  const { chefId, kitchenId } = useReceivingContext();
  const enabled = Boolean(chefId && kitchenId && orderId);

  return useQuery<OrderWithLinesDto>({
    queryKey: queryKeys.deliveries.detail(chefId, kitchenId, orderId),
    queryFn: () => getOrder(kitchenId, orderId),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useStartDelivery() {
  const { chefId, kitchenId } = useReceivingContext();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => startDelivery(kitchenId, orderId),
    onSuccess: (_data, orderId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.deliveries.list(chefId, kitchenId) });
      void qc.invalidateQueries({ queryKey: queryKeys.deliveries.detail(chefId, kitchenId, orderId) });
      void qc.invalidateQueries({ queryKey: queryKeys.orders.list(chefId, kitchenId) });
    },
  });
}

export function useReceiveDelivery() {
  const { chefId, kitchenId } = useReceivingContext();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, body }: { orderId: string; body: BulkReceivingBody }) =>
      receiveDelivery(kitchenId, orderId, body),
    onSuccess: (_data, { orderId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.deliveries.list(chefId, kitchenId) });
      void qc.invalidateQueries({ queryKey: queryKeys.deliveries.detail(chefId, kitchenId, orderId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stock(chefId, kitchenId) });
    },
  });
}
