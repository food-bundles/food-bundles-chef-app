import { useQuery } from '@tanstack/react-query';
import { useKitchenStore } from '@/store/kitchen-store';
import { useSessionStore } from '@/store/session-store';
import { queryKeys } from '@/api/query-keys';
import { listCatalogProducts, type CatalogProductDto } from '@/api/catalog-api';

export type { CatalogProductDto };

export function useCatalog() {
  const chefId = useSessionStore((s) => s.chef?.id ?? '');
  // Only kitchens in countries Food Bundles serves see the catalogue (backend decides).
  const catalogAvailable = useKitchenStore((s) => s.activeKitchen?.catalogAvailable ?? false);

  return useQuery<CatalogProductDto[]>({
    queryKey: queryKeys.supplierCatalog.products(chefId),
    queryFn: () => listCatalogProducts(),
    enabled: !!chefId && catalogAvailable,
    staleTime: 5 * 60 * 1000, // catalog changes rarely
  });
}
