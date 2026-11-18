import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSessionStore } from '@/store/session-store';
import { useKitchenStore } from '@/store/kitchen-store';
import { queryKeys } from '@/api/query-keys';
import { getDailySalesSummary, recordSale } from '@/api/sales-api';
import type { SaleRecordCreateBody } from '@/api/sales-api';
import { localISODate } from '@/lib/format';

export function useRecordSale() {
  const chefId = useSessionStore((s) => s.chef?.id ?? '');
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const kitchenId = activeKitchen?.id ?? '';
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: SaleRecordCreateBody) => recordSale(kitchenId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.sales.records(chefId, kitchenId) });
      // Recording sales deducts recipe ingredients from stock on the server.
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stock(chefId, kitchenId) });
      // Demand changes after sales are recorded
      void qc.invalidateQueries({ queryKey: queryKeys.purchasing.suggestions(chefId, kitchenId) });
    },
  });
}

/** Today's portions and revenue for the active kitchen (kitchen-local calendar day). */
export function useTodaySales() {
  const chefId = useSessionStore((s) => s.chef?.id ?? '');
  const kitchenId = useKitchenStore((s) => s.activeKitchen?.id ?? '');
  const day = localISODate();
  return useQuery({
    queryKey: queryKeys.sales.daily(chefId, kitchenId, day),
    queryFn: () => getDailySalesSummary(kitchenId, day),
    enabled: Boolean(kitchenId),
    staleTime: 60_000,
  });
}
