import { useQuery } from '@tanstack/react-query';
import { useSessionStore } from '@/store/session-store';
import { useKitchenStore } from '@/store/kitchen-store';
import { queryKeys } from '@/api/query-keys';
import { listIngredients } from '@/api/ingredients-api';

/** Active ingredients of the active kitchen. */
export function useIngredients() {
  const chefId = useSessionStore((s) => s.chef?.id ?? '');
  const kitchenId = useKitchenStore((s) => s.activeKitchen?.id ?? '');
  return useQuery({
    queryKey: queryKeys.catalog.ingredients(chefId, kitchenId),
    queryFn: async () => (await listIngredients(kitchenId)).filter((i) => i.is_active),
    enabled: Boolean(kitchenId),
    staleTime: 60_000,
  });
}
