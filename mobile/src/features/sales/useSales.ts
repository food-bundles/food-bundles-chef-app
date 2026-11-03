import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSessionStore } from '@/store/session-store';
import { useKitchenStore } from '@/store/kitchen-store';
import { queryKeys } from '@/api/query-keys';
import { recordSale } from '@/api/sales-api';
import type { SaleRecordCreateBody } from '@/api/sales-api';

export function useRecordSale() {
  const chefId = useSessionStore((s) => s.chef?.id ?? '');
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const kitchenId = activeKitchen?.id ?? '';
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: SaleRecordCreateBody) => recordSale(kitchenId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.sales.records(chefId, kitchenId) });
      // Invalidate purchasing suggestions — demand changes after sales are recorded
      void qc.invalidateQueries({ queryKey: queryKeys.purchasing.suggestions(chefId, kitchenId) });
    },
  });
}
