import { draftCustom, draftFromCatalog, parseQty, planRecipeSave, type DraftLine } from '@/features/menu/dish-form';
import type { RecipeLineDto } from '@/api/menus-api';
import type { CatalogProductDto } from '@/api/catalog-api';
import type { IngredientDto } from '@/api/ingredients-api';

const recipe = (id: string, qty: string): RecipeLineDto => ({
  id,
  menu_item_id: 'boilo',
  kitchen_id: 'k',
  ingredient_id: `ing-${id}`,
  qty_per_portion: qty,
  yield_fraction_override: null,
  unit: 'kg',
  notes: null,
  created_at: '',
  updated_at: '',
});

const line = (over: Partial<DraftLine>): DraftLine => ({
  key: Math.random().toString(),
  ingredientId: 'ing',
  catalogProductId: null,
  name: 'Chicken',
  unit: 'kg',
  pricePerUnit: 4500,
  priceCurrency: 'RWF',
  fbPrice: true,
  qty: '0.25',
  ...over,
});

describe('parseQty', () => {
  it.each([
    ['0.25', 0.25],
    ['0,25', 0.25],
    ['2', 2],
    ['.5', 0.5],
    ['', null],
    ['abc', null],
    ['-1', null],
  ])('%p → %p', (text, value) => {
    expect(parseQty(text)).toBe(value);
  });
});

describe('planRecipeSave', () => {
  const original = [recipe('a', '0.2500'), recipe('b', '0.3000'), recipe('c', '0.0500')];

  it('adds new lines, updates changed quantities and removes deleted lines', () => {
    const plan = planRecipeSave(original, [
      line({ lineId: 'a', qty: '0.25' }), // unchanged
      line({ lineId: 'b', qty: '0.35' }), // changed
      line({ qty: '0.03', ingredientId: null, catalogProductId: 'fb-onion' }), // new
      // c removed
    ]);
    expect(plan.update).toEqual([{ lineId: 'b', qty: '0.35' }]);
    expect(plan.add).toHaveLength(1);
    expect(plan.remove).toEqual(['c']);
  });

  it('a line emptied to 0 or blank is removed; a new line without a quantity is not added', () => {
    const plan = planRecipeSave(original, [
      line({ lineId: 'a', qty: '0' }),
      line({ lineId: 'b', qty: '' }),
      line({ lineId: 'c', qty: '0.05' }),
      line({ qty: '' }),
    ]);
    expect(plan.remove.sort()).toEqual(['a', 'b']);
    expect(plan.add).toEqual([]);
    expect(plan.update).toEqual([]);
  });
});

describe('catalogue picks use the Food Bundles price', () => {
  const product: CatalogProductDto = {
    id: 'fb-chicken',
    sku: 'FB-1',
    name: 'Chicken',
    category: 'meat',
    unit: 'kg',
    reference_price: '4500',
    reference_price_currency: 'RWF',
    reference_price_money: { amount: '4500', currency: 'RWF' },
    description: null,
    image_url: null,
    is_active: true,
    updated_at: '',
  };

  it('a new catalogue product carries its FB price', () => {
    const d = draftFromCatalog(product, []);
    expect(d).toMatchObject({ ingredientId: null, catalogProductId: 'fb-chicken', pricePerUnit: 4500, fbPrice: true, unit: 'kg' });
  });

  it('reuses the kitchen ingredient already linked to the product', () => {
    const ing = {
      id: 'ing-chicken',
      name: 'Chicken',
      unit: 'kg',
      cost_per_unit: '4500.000000',
      cost_per_unit_currency: 'RWF',
      catalog_product_id: 'fb-chicken',
    } as IngredientDto;
    expect(draftFromCatalog(product, [ing]).ingredientId).toBe('ing-chicken');
  });

  it('a custom ingredient keeps the chef’s own price', () => {
    expect(draftCustom(' Mama spice ', 'kg', 2000, 'RWF')).toMatchObject({ name: 'Mama spice', fbPrice: false, pricePerUnit: 2000 });
  });
});
