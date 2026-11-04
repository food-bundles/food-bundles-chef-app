import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSessionStore } from '@/store/session-store';
import { useKitchenStore } from '@/store/kitchen-store';
import { queryKeys } from '@/api/query-keys';
import {
  listMenus,
  listMenuItems,
  createMenuItem,
  updateMenuItem,
} from '@/api/menus-api';
import type { MenuItemCreateBody, MenuItemUpdateBody, MenuItemDto } from '@/api/menus-api';

function useMenuContext() {
  const chefId = useSessionStore((s) => s.chef?.id ?? '');
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  return { chefId, kitchenId: activeKitchen?.id ?? '' };
}

/** Fetches all menu items across all menus for the active kitchen. */
export function useMenuItems() {
  const { chefId, kitchenId } = useMenuContext();
  const enabled = Boolean(chefId && kitchenId);

  return useQuery({
    queryKey: queryKeys.menu.items(chefId, kitchenId),
    queryFn: async (): Promise<MenuItemDto[]> => {
      const menus = await listMenus(kitchenId);
      const itemLists = await Promise.all(
        menus.map((m) => listMenuItems(kitchenId, m.id)),
      );
      return itemLists.flat();
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateMenuItem(menuId: string) {
  const { chefId, kitchenId } = useMenuContext();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: MenuItemCreateBody) =>
      createMenuItem(kitchenId, menuId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.menu.items(chefId, kitchenId) });
    },
  });
}

export function useToggleMenuItemActive() {
  const { chefId, kitchenId } = useMenuContext();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      menuId,
      itemId,
      isActive,
    }: {
      menuId: string;
      itemId: string;
      isActive: boolean;
    }) => {
      const body: MenuItemUpdateBody = { is_active: !isActive };
      return updateMenuItem(kitchenId, menuId, itemId, body);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.menu.items(chefId, kitchenId) });
    },
  });
}
