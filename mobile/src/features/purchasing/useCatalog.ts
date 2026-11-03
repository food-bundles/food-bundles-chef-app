import { useQuery } from '@tanstack/react-query';
import { useSessionStore } from '@/store/session-store';
import { queryKeys } from '@/api/query-keys';
import { listCatalogProducts, type CatalogProductDto } from '@/api/catalog-api';

export type { CatalogProductDto };

export function useCatalog() {
  const chefId = useSessionStore((s) => s.chef?.id ?? '');

  return useQuery<CatalogProductDto[]>({
    queryKey: queryKeys.supplierCatalog.products(chefId),
    queryFn: () => listCatalogProducts(),
    enabled: !!chefId,
    staleTime: 5 * 60 * 1000, // catalog changes rarely
  });
}
