import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSessionStore } from '@/store/session-store';
import { useKitchenStore } from '@/store/kitchen-store';
import { queryKeys } from '@/api/query-keys';
import {
  listMenus,
  listMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  listRecipeLines,
  addRecipeLine,
  deleteRecipeLine,
  getRecipeCost,
} from '@/api/menus-api';
import type { MenuItemCreateBody, MenuItemUpdateBody, MenuItemDto, RecipeLineCreateBody, RecipeLineDto, RecipeCostDto } from '@/api/menus-api';

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

export function useUpdateMenuItem() {
  const { chefId, kitchenId } = useMenuContext();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      menuId,
      itemId,
      body,
    }: {
      menuId: string;
      itemId: string;
      body: MenuItemUpdateBody;
    }) => updateMenuItem(kitchenId, menuId, itemId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.menu.items(chefId, kitchenId) });
    },
  });
}

export function useDeleteMenuItem() {
  const { chefId, kitchenId } = useMenuContext();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ menuId, itemId }: { menuId: string; itemId: string }) =>
      deleteMenuItem(kitchenId, menuId, itemId),
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

export function useRecipeLines(menuItemId: string) {
  const { chefId, kitchenId } = useMenuContext();
  const enabled = Boolean(chefId && kitchenId && menuItemId);
  return useQuery<RecipeLineDto[]>({
    queryKey: queryKeys.menu.recipe(chefId, kitchenId, menuItemId),
    queryFn: () => listRecipeLines(kitchenId, menuItemId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecipeCost(menuItemId: string) {
  const { chefId, kitchenId } = useMenuContext();
  const enabled = Boolean(chefId && kitchenId && menuItemId);
  return useQuery<RecipeCostDto>({
    queryKey: [...queryKeys.menu.recipe(chefId, kitchenId, menuItemId), 'cost'],
    queryFn: () => getRecipeCost(kitchenId, menuItemId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAddRecipeLine(menuItemId: string) {
  const { chefId, kitchenId } = useMenuContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RecipeLineCreateBody) => addRecipeLine(kitchenId, menuItemId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.menu.recipe(chefId, kitchenId, menuItemId) });
    },
  });
}

export function useDeleteRecipeLine(menuItemId: string) {
  const { chefId, kitchenId } = useMenuContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lineId: string) => deleteRecipeLine(kitchenId, menuItemId, lineId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.menu.recipe(chefId, kitchenId, menuItemId) });
    },
  });
}
