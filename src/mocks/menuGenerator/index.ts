import type { CuisineType, MenuDish } from '../types';
import { africanDishes } from './african';
import { indianDishes } from './indian';
import { westernDishes } from './western';
import { asianDishes } from './asian';
import { mediterraneanDishes } from './mediterranean';
import { fusionDishes } from './fusion';

/** All seed menu dishes, keyed by cuisine — 8 dishes each, mapped to real product mocks. */
export const menuDishesByCuisine: Record<CuisineType, MenuDish[]> = {
  AFRICAN: africanDishes,
  INDIAN: indianDishes,
  WESTERN: westernDishes,
  ASIAN: asianDishes,
  MEDITERRANEAN: mediterraneanDishes,
  FUSION: fusionDishes,
};

/** Filters a cuisine's dishes down to those matching at least one of the requested meal types. */
export function getDishesForMenu(cuisine: CuisineType, mealTypes: MenuDish['mealTypes']): MenuDish[] {
  return menuDishesByCuisine[cuisine].filter((dish) => dish.mealTypes.some((meal) => mealTypes.includes(meal)));
}
