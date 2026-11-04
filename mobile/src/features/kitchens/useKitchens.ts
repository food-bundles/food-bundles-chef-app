import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSessionStore } from '@/store/session-store';
import { useKitchenStore } from '@/store/kitchen-store';
import { queryKeys } from '@/api/query-keys';
import {
  listKitchens,
  createKitchen,
  updateKitchen,
  archiveKitchen,
} from '@/api/kitchens-api';
import type { KitchenCreateBody, KitchenUpdateBody, KitchenDto } from '@/api/kitchens-api';

function useChefId() {
  return useSessionStore((s) => s.chef?.id ?? '');
}

/** List all kitchens for the authenticated chef. Syncs into kitchen-store on success. */
export function useKitchens() {
  const chefId = useChefId();
  const setKitchens = useKitchenStore((s) => s.setKitchens);

  const query = useQuery<KitchenDto[]>({
    queryKey: queryKeys.kitchens.list(chefId),
    queryFn: () => listKitchens(),
    enabled: !!chefId,
  });

  useEffect(() => {
    if (query.data) {
      setKitchens(query.data);
    }
  }, [query.data, setKitchens]);

  return query;
}

/** Create a new kitchen and invalidate the list. */
export function useCreateKitchen() {
  const chefId = useChefId();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: KitchenCreateBody) => createKitchen(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.kitchens.list(chefId) });
    },
  });
}

/** Update a kitchen and invalidate caches. */
export function useUpdateKitchen() {
  const chefId = useChefId();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ kitchenId, body }: { kitchenId: string; body: KitchenUpdateBody }) =>
      updateKitchen(kitchenId, body),
    onSuccess: (_data, { kitchenId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.kitchens.list(chefId) });
      void qc.invalidateQueries({ queryKey: queryKeys.kitchens.detail(chefId, kitchenId) });
    },
  });
}

/** Archive a kitchen and invalidate caches. */
export function useArchiveKitchen() {
  const chefId = useChefId();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (kitchenId: string) => archiveKitchen(kitchenId),
    onSuccess: (_data, kitchenId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.kitchens.list(chefId) });
      void qc.invalidateQueries({ queryKey: queryKeys.kitchens.detail(chefId, kitchenId) });
    },
  });
}
