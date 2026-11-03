import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSessionStore } from '@/store/session-store';
import { useKitchenStore } from '@/store/kitchen-store';
import { queryKeys } from '@/api/query-keys';
import { listOrders, getOrder, createOrder, submitOrder, cancelOrder } from '@/api/orders-api';
import type { OrderCreateBody, OrderDto, OrderWithLinesDto } from '@/api/orders-api';

function useOrdersContext() {
  const chefId = useSessionStore((s) => s.chef?.id ?? '');
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  return { chefId, kitchenId: activeKitchen?.id ?? '' };
}

export function useOrders() {
  const { chefId, kitchenId } = useOrdersContext();
  const enabled = Boolean(chefId && kitchenId);

  return useQuery<OrderDto[]>({
    queryKey: queryKeys.orders.list(chefId, kitchenId),
    queryFn: () => listOrders(kitchenId),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useOrderDetail(orderId: string) {
  const { chefId, kitchenId } = useOrdersContext();
  return useQuery<OrderWithLinesDto>({
    queryKey: [...queryKeys.orders.list(chefId, kitchenId), orderId],
    queryFn: () => getOrder(kitchenId, orderId),
    enabled: Boolean(chefId && kitchenId && orderId),
    staleTime: 60 * 1000,
  });
}

export function useCreateOrder() {
  const { chefId, kitchenId } = useOrdersContext();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: OrderCreateBody) => createOrder(kitchenId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.orders.list(chefId, kitchenId) });
    },
  });
}

export function useSubmitOrder() {
  const { chefId, kitchenId } = useOrdersContext();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => submitOrder(kitchenId, orderId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.orders.list(chefId, kitchenId) });
    },
  });
}

export function useCancelOrder() {
  const { chefId, kitchenId } = useOrdersContext();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => cancelOrder(kitchenId, orderId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.orders.list(chefId, kitchenId) });
    },
  });
}
