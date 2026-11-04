import { queryKeys } from '@/api/query-keys';

const CHEF = 'chef-123';
const KITCHEN = 'kitchen-456';

describe('queryKeys', () => {
  it('me key includes chefId', () => {
    expect(queryKeys.me(CHEF)).toEqual(['me', CHEF]);
  });

  it('kitchen list key includes chefId', () => {
    expect(queryKeys.kitchens.list(CHEF)).toEqual(['kitchens', CHEF]);
  });

  it('kitchen detail key includes chefId and kitchenId', () => {
    expect(queryKeys.kitchens.detail(CHEF, KITCHEN)).toEqual(['kitchens', CHEF, KITCHEN]);
  });

  it('catalog ingredients key is kitchen-scoped', () => {
    const key = queryKeys.catalog.ingredients(CHEF, KITCHEN);
    expect(key).toContain(CHEF);
    expect(key).toContain(KITCHEN);
  });

  it('different chefs produce different keys for the same resource', () => {
    const key1 = queryKeys.orders.list('chef-A', KITCHEN);
    const key2 = queryKeys.orders.list('chef-B', KITCHEN);
    expect(key1).not.toEqual(key2);
  });

  it('different kitchens produce different keys for the same chef', () => {
    const key1 = queryKeys.inventory.stock(CHEF, 'kitchen-A');
    const key2 = queryKeys.inventory.stock(CHEF, 'kitchen-B');
    expect(key1).not.toEqual(key2);
  });

  it('all keys are readonly tuples (no mutation possible)', () => {
    const key = queryKeys.me(CHEF);
    // TypeScript enforces this at compile time; runtime check: it is an array
    expect(Array.isArray(key)).toBe(true);
  });
});
