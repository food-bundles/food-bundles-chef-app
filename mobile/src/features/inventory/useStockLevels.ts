import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSessionStore } from '@/store/session-store';
import { useKitchenStore } from '@/store/kitchen-store';
import { queryKeys } from '@/api/query-keys';
import { getStockLevels, recordInventoryEntry, getInventoryHistory } from '@/api/inventory-api';
import type { InventoryEntryCreateBody, StockLevelDto } from '@/api/inventory-api';
import { getIngredient } from '@/api/ingredients-api';
import type { IngredientDto } from '@/api/ingredients-api';

function useInventoryContext() {
  const chefId = useSessionStore((s) => s.chef?.id ?? '');
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  return { chefId, kitchenId: activeKitchen?.id ?? '' };
}

/** Fetches backend-computed stock levels for the active kitchen. */
export function useStockLevels() {
  const { chefId, kitchenId } = useInventoryContext();
  const enabled = Boolean(chefId && kitchenId);

  return useQuery<StockLevelDto[]>({
    queryKey: queryKeys.inventory.stock(chefId, kitchenId),
    queryFn: () => getStockLevels(kitchenId),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useRecordInventoryEntry() {
  const { chefId, kitchenId } = useInventoryContext();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: InventoryEntryCreateBody) =>
      recordInventoryEntry(kitchenId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stock(chefId, kitchenId) });
    },
  });
}

export function useIngredientDetail(ingredientId: string) {
  const { chefId, kitchenId } = useInventoryContext();
  const enabled = Boolean(chefId && kitchenId && ingredientId);
  return useQuery<IngredientDto>({
    queryKey: queryKeys.catalog.ingredient(chefId, kitchenId, ingredientId),
    queryFn: () => getIngredient(kitchenId, ingredientId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useInventoryHistory(ingredientId: string) {
  const { chefId, kitchenId } = useInventoryContext();
  const enabled = Boolean(chefId && kitchenId && ingredientId);
  return useQuery({
    queryKey: ['inventory', 'history', chefId, kitchenId, ingredientId],
    queryFn: () => getInventoryHistory(kitchenId, ingredientId),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}
