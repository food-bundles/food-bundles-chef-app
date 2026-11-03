import type { MenuDish } from '@/mocks/types';
import { products } from '@/mocks/products';

export interface ConsolidatedIngredient {
  productId: string;
  qty: number;
  source: string;
}

/**
 * Merges every ingredient across a set of dishes into one de-duplicated, summed shopping
 * list, sorted with FoodBundles-sourced items first (the platform's own supply), then by
 * unit price ascending.
 */
export function consolidateIngredients(dishes: MenuDish[]): ConsolidatedIngredient[] {
  const byProduct = new Map<string, ConsolidatedIngredient>();

  for (const dish of dishes) {
    for (const ingredient of dish.ingredients) {
      const existing = byProduct.get(ingredient.productId);
      if (existing) {
        existing.qty += ingredient.qty;
      } else {
        byProduct.set(ingredient.productId, {
          productId: ingredient.productId,
          qty: ingredient.qty,
          source: dish.source,
        });
      }
    }
  }

  return Array.from(byProduct.values()).sort((a, b) => {
    if (a.source !== b.source) return a.source === 'FoodBundles' ? -1 : 1;
    const priceA = products.find((p) => p.id === a.productId)?.price ?? 0;
    const priceB = products.find((p) => p.id === b.productId)?.price ?? 0;
    return priceA - priceB;
  });
}
