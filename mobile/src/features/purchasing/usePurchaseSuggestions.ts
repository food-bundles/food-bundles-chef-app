import { useQuery } from '@tanstack/react-query';
import { useSessionStore } from '@/store/session-store';
import { useKitchenStore } from '@/store/kitchen-store';
import { queryKeys } from '@/api/query-keys';
import { getPurchaseSuggestions } from '@/api/purchasing-api';
import type { PurchaseSuggestionsResponseDto } from '@/api/purchasing-api';

/**
 * Fetches server-computed purchase suggestions.
 *
 * The backend owns all demand and purchase calculations.
 * Mobile must NOT re-derive the weighted-demand formula.
 */
export function usePurchaseSuggestions() {
  const chefId = useSessionStore((s) => s.chef?.id ?? '');
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const kitchenId = activeKitchen?.id ?? '';
  const enabled = Boolean(chefId && kitchenId);

  return useQuery<PurchaseSuggestionsResponseDto>({
    queryKey: queryKeys.purchasing.suggestions(chefId, kitchenId),
    queryFn: () => getPurchaseSuggestions(kitchenId),
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}
