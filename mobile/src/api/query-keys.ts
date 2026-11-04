/**
 * TanStack Query key factory.
 *
 * All keys are scoped by chefId and, where relevant, kitchenId so that
 * switching accounts or kitchens never leaks cached data across contexts.
 *
 * Usage:
 *   queryKeys.me(chefId)
 *   queryKeys.kitchens.list(chefId)
 *   queryKeys.kitchens.detail(chefId, kitchenId)
 *   queryKeys.catalog.ingredients(chefId, kitchenId)
 */

export const queryKeys = {
  /** Authenticated chef profile */
  me: (chefId: string) => ['me', chefId] as const,

  kitchens: {
    /** All kitchens belonging to this chef */
    list: (chefId: string) => ['kitchens', chefId] as const,
    /** Single kitchen detail */
    detail: (chefId: string, kitchenId: string) =>
      ['kitchens', chefId, kitchenId] as const,
  },

  catalog: {
    /** Ingredient catalog for a kitchen */
    ingredients: (chefId: string, kitchenId: string) =>
      ['catalog', 'ingredients', chefId, kitchenId] as const,
    /** Single ingredient */
    ingredient: (chefId: string, kitchenId: string, ingredientId: string) =>
      ['catalog', 'ingredients', chefId, kitchenId, ingredientId] as const,
  },

  menu: {
    /** Menu items for a kitchen */
    items: (chefId: string, kitchenId: string) =>
      ['menu', 'items', chefId, kitchenId] as const,
    /** Single menu item */
    item: (chefId: string, kitchenId: string, itemId: string) =>
      ['menu', 'items', chefId, kitchenId, itemId] as const,
    /** Recipe lines for a menu item */
    recipe: (chefId: string, kitchenId: string, itemId: string) =>
      ['menu', 'recipe', chefId, kitchenId, itemId] as const,
  },

  sales: {
    /** Daily sale records for a kitchen */
    records: (chefId: string, kitchenId: string) =>
      ['sales', chefId, kitchenId] as const,
  },

  orders: {
    /** Order list for a kitchen */
    list: (chefId: string, kitchenId: string) =>
      ['orders', chefId, kitchenId] as const,
    /** Single order detail */
    detail: (chefId: string, kitchenId: string, orderId: string) =>
      ['orders', chefId, kitchenId, orderId] as const,
  },

  inventory: {
    /** Stock entries for a kitchen */
    stock: (chefId: string, kitchenId: string) =>
      ['inventory', 'stock', chefId, kitchenId] as const,
  },

  deliveries: {
    /** Delivery list for a kitchen */
    list: (chefId: string, kitchenId: string) =>
      ['deliveries', chefId, kitchenId] as const,
    /** Single delivery detail */
    detail: (chefId: string, kitchenId: string, deliveryId: string) =>
      ['deliveries', chefId, kitchenId, deliveryId] as const,
  },

  purchasing: {
    /** Server-computed purchase suggestions for a kitchen */
    suggestions: (chefId: string, kitchenId: string) =>
      ['purchasing', 'suggestions', chefId, kitchenId] as const,
  },

  supplierCatalog: {
    /** Food Bundles supplier product catalog (global, not per-kitchen) */
    products: (chefId: string) => ['supplier-catalog', 'products', chefId] as const,
  },
} as const;
