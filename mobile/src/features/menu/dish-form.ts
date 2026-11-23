/**
 * Dish recipe form (spec screen 09): the draft the chef edits and how it is saved.
 *
 * Pure helpers (planRecipeSave, parseQty, draftFromCatalog, …) are unit-tested; saveDish does
 * the API calls. Menu editing is online-only (offline is for service: commands, receiving).
 */
import type { CatalogProductDto } from '@/api/catalog-api';
import { createIngredient, type IngredientDto } from '@/api/ingredients-api';
import {
  addRecipeLine,
  createMenu,
  createMenuItem,
  deleteRecipeLine,
  listMenus,
  updateMenuItem,
  updateRecipeLine,
  type MenuItemCategory,
  type RecipeLineDto,
} from '@/api/menus-api';

/** One ingredient line of the recipe being edited (quantity for 1 portion). */
export interface DraftLine {
  /** Stable key for the list. */
  key: string;
  /** Existing recipe line (edit), or undefined for a new one. */
  lineId?: string;
  /** Kitchen ingredient, or null until a catalogue/custom pick is created on save. */
  ingredientId: string | null;
  /** Food Bundles catalogue product (its price is the FB price). */
  catalogProductId: string | null;
  name: string;
  /** Base unit: kg, L, pcs … (recipe quantities are stored in it). */
  unit: string;
  /** Price per unit; null when unknown. */
  pricePerUnit: number | null;
  priceCurrency: string | null;
  /** True for a catalogue price, false for the chef's own (custom ingredient). */
  fbPrice: boolean;
  /** Quantity as typed. */
  qty: string;
}

/** "0,25" or "0.25" → 0.25; empty or invalid → null. */
export function parseQty(text: string): number | null {
  const normal = text.trim().replace(',', '.');
  if (!normal || !/^\d*\.?\d+$|^\d+\.$/.test(normal)) return null;
  const n = Number(normal);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

let keySeq = 0;
/** A new unique list key. */
export function newLineKey(): string {
  keySeq += 1;
  return `line-${Date.now().toString(36)}-${keySeq}`;
}

/** A recipe line for a kitchen ingredient. */
export function draftFromIngredient(ing: IngredientDto, qty = ''): DraftLine {
  const price = ing.cost_per_unit !== null ? Number(ing.cost_per_unit) : null;
  return {
    key: newLineKey(),
    ingredientId: ing.id,
    catalogProductId: ing.catalog_product_id ?? null,
    name: ing.name,
    unit: ing.unit,
    pricePerUnit: price !== null && Number.isFinite(price) ? price : null,
    priceCurrency: ing.cost_per_unit_currency,
    fbPrice: Boolean(ing.catalog_product_id),
    qty,
  };
}

/** A recipe line for a catalogue product. Reuses the kitchen ingredient linked to it if any. */
export function draftFromCatalog(product: CatalogProductDto, ingredients: readonly IngredientDto[], qty = ''): DraftLine {
  const linked = ingredients.find((i) => i.catalog_product_id === product.id);
  if (linked) return draftFromIngredient(linked, qty);
  const money = product.reference_price_money;
  const amount = money ? Number(money.amount) : product.reference_price !== null ? Number(product.reference_price) : null;
  return {
    key: newLineKey(),
    ingredientId: null,
    catalogProductId: product.id,
    name: product.name,
    unit: product.unit,
    pricePerUnit: amount !== null && Number.isFinite(amount) ? amount : null,
    priceCurrency: money?.currency ?? product.reference_price_currency,
    fbPrice: true,
    qty,
  };
}

/** A custom ingredient typed by the chef (not in the catalogue), with their own price. */
export function draftCustom(name: string, unit: string, price: number | null, currency: string, qty = ''): DraftLine {
  return {
    key: newLineKey(),
    ingredientId: null,
    catalogProductId: null,
    name: name.trim(),
    unit,
    pricePerUnit: price,
    priceCurrency: price !== null ? currency : null,
    fbPrice: false,
    qty,
  };
}

/** Draft lines from the saved recipe and the kitchen's ingredients. */
export function draftsFromRecipe(lines: readonly RecipeLineDto[], ingredients: readonly IngredientDto[]): DraftLine[] {
  return lines.map((line) => {
    const ing = ingredients.find((i) => i.id === line.ingredient_id);
    const base: DraftLine = ing
      ? draftFromIngredient(ing, String(Number(line.qty_per_portion)))
      : {
          key: newLineKey(),
          ingredientId: line.ingredient_id,
          catalogProductId: null,
          name: '—',
          unit: line.unit,
          pricePerUnit: null,
          priceCurrency: null,
          fbPrice: false,
          qty: String(Number(line.qty_per_portion)),
        };
    return { ...base, lineId: line.id };
  });
}

export interface RecipePlan {
  add: DraftLine[];
  update: { lineId: string; qty: string }[];
  remove: string[];
}

/**
 * What to send so the saved recipe equals the draft: new lines, changed quantities and
 * removed lines. Lines with no valid quantity are not saved.
 */
export function planRecipeSave(original: readonly RecipeLineDto[], draft: readonly DraftLine[]): RecipePlan {
  const kept = new Set<string>();
  const add: DraftLine[] = [];
  const update: { lineId: string; qty: string }[] = [];
  for (const line of draft) {
    const qty = parseQty(line.qty);
    if (line.lineId) {
      kept.add(line.lineId);
      const before = original.find((o) => o.id === line.lineId);
      if (qty !== null && qty > 0 && before && Number(before.qty_per_portion) !== qty) {
        update.push({ lineId: line.lineId, qty: String(qty) });
      }
      if (qty === null || qty === 0) kept.delete(line.lineId);
    } else if (qty !== null && qty > 0) {
      add.push(line);
    }
  }
  const remove = original.filter((o) => !kept.has(o.id)).map((o) => o.id);
  return { add, update, remove };
}

export interface DishInput {
  /** Existing dish (edit), or undefined to create. */
  itemId?: string;
  menuId?: string;
  name: string;
  /** Decimal string in the kitchen's currency. */
  price: string;
  currency: string;
  category: MenuItemCategory | null;
  isActive: boolean;
}

/** Save the dish and its recipe. Returns the dish id. */
export async function saveDish(
  kitchenId: string,
  dish: DishInput,
  draft: readonly DraftLine[],
  original: readonly RecipeLineDto[],
  ingredients: readonly IngredientDto[],
  defaultMenuName: string,
): Promise<string> {
  let itemId = dish.itemId;
  if (itemId && dish.menuId) {
    await updateMenuItem(kitchenId, dish.menuId, itemId, {
      name: dish.name.trim(),
      selling_price: dish.price,
      selling_price_currency: dish.currency,
      category: dish.category,
      is_active: dish.isActive,
    });
  } else {
    const menus = await listMenus(kitchenId);
    const menuId = menus.find((m) => m.is_active)?.id ?? (await createMenu(kitchenId, { name: defaultMenuName })).id;
    const created = await createMenuItem(kitchenId, menuId, {
      name: dish.name.trim(),
      selling_price: dish.price,
      selling_price_currency: dish.currency,
      category: dish.category,
    });
    itemId = created.id;
    if (!dish.isActive) await updateMenuItem(kitchenId, menuId, itemId, { is_active: false });
  }

  const plan = planRecipeSave(original, draft);
  for (const lineId of plan.remove) await deleteRecipeLine(kitchenId, itemId, lineId);
  for (const u of plan.update) await updateRecipeLine(kitchenId, itemId, u.lineId, { qty_per_portion: u.qty });
  for (const line of plan.add) {
    const ingredientId = line.ingredientId ?? (await ensureIngredient(kitchenId, line, ingredients));
    await addRecipeLine(kitchenId, itemId, {
      ingredient_id: ingredientId,
      qty_per_portion: String(parseQty(line.qty)),
      unit: line.unit,
    });
  }
  return itemId;
}

async function ensureIngredient(kitchenId: string, line: DraftLine, ingredients: readonly IngredientDto[]): Promise<string> {
  const existing = line.catalogProductId
    ? ingredients.find((i) => i.catalog_product_id === line.catalogProductId)
    : ingredients.find((i) => i.name.trim().toLowerCase() === line.name.trim().toLowerCase());
  if (existing) return existing.id;
  const created = await createIngredient(kitchenId, {
    name: line.name,
    unit: line.unit,
    ...(line.catalogProductId
      ? { catalog_product_id: line.catalogProductId }
      : line.pricePerUnit !== null
        ? { cost_per_unit: String(line.pricePerUnit), cost_per_unit_currency: line.priceCurrency }
        : {}),
  });
  return created.id;
}
