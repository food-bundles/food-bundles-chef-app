import type { MenuDish } from '../types';
import { FOODBUNDLES, KIMIRONKO, dishPhoto } from './constants';

export const asianDishes: MenuDish[] = [
  {
    id: 'as-1',
    name: 'Vegetable Fried Rice',
    cuisine: 'ASIAN',
    mealTypes: ['LUNCH', 'DINNER'],
    source: FOODBUNDLES,
    image: dishPhoto('photo-1512058564366-18510be2db19'),
    ingredients: [
      { productId: 'rice', qty: 1 },
      { productId: 'carrots', qty: 1 },
      { productId: 'green-beans', qty: 1 },
      { productId: 'cooking-oil', qty: 1 },
    ],
  },
  {
    id: 'as-2',
    name: 'Cabbage Stir Fry',
    cuisine: 'ASIAN',
    mealTypes: ['LUNCH', 'ALL_DAY'],
    source: KIMIRONKO,
    image: dishPhoto('photo-1594282486552-05b4d80fbb9f'),
    ingredients: [
      { productId: 'cabbage', qty: 2 },
      { productId: 'carrots', qty: 1 },
      { productId: 'cooking-oil', qty: 1 },
    ],
  },
  {
    id: 'as-3',
    name: 'Egg Fried Rice',
    cuisine: 'ASIAN',
    mealTypes: ['BREAKFAST', 'LUNCH'],
    source: FOODBUNDLES,
    image: dishPhoto('photo-1603133872878-684f208fb84b'),
    ingredients: [
      { productId: 'rice', qty: 1 },
      { productId: 'eggs', qty: 1 },
      { productId: 'cooking-oil', qty: 1 },
    ],
  },
  {
    id: 'as-4',
    name: 'Spinach & Onion Noodle Style',
    cuisine: 'ASIAN',
    mealTypes: ['DINNER'],
    source: FOODBUNDLES,
    image: dishPhoto('photo-1585032226651-759b368d7246'),
    ingredients: [
      { productId: 'spinach', qty: 2 },
      { productId: 'red-onions', qty: 1 },
    ],
  },
  {
    id: 'as-5',
    name: 'Tomato Soup with Greens',
    cuisine: 'ASIAN',
    mealTypes: ['DINNER', 'ALL_DAY'],
    source: KIMIRONKO,
    image: dishPhoto('photo-1546554137-f86b9593d2a1'),
    ingredients: [
      { productId: 'fresh-tomatoes', qty: 2 },
      { productId: 'spinach', qty: 1 },
    ],
  },
  {
    id: 'as-6',
    name: 'Bean & Carrot Salad',
    cuisine: 'ASIAN',
    mealTypes: ['LUNCH'],
    source: FOODBUNDLES,
    image: dishPhoto('photo-1512058564366-18510be2db19'),
    ingredients: [
      { productId: 'green-beans', qty: 1 },
      { productId: 'carrots', qty: 1 },
    ],
  },
  {
    id: 'as-7',
    name: 'Potato & Onion Hash',
    cuisine: 'ASIAN',
    mealTypes: ['BREAKFAST'],
    source: FOODBUNDLES,
    image: dishPhoto('photo-1598103442097-8b74394b95c6'),
    ingredients: [
      { productId: 'irish-potatoes', qty: 1 },
      { productId: 'red-onions', qty: 1 },
      { productId: 'cooking-oil', qty: 1 },
    ],
  },
  {
    id: 'as-8',
    name: 'Avocado Rice Bowl',
    cuisine: 'ASIAN',
    mealTypes: ['LUNCH', 'ALL_DAY'],
    source: FOODBUNDLES,
    image: dishPhoto('photo-1512621776951-a57141f2eefd'),
    ingredients: [
      { productId: 'rice', qty: 1 },
      { productId: 'avocados', qty: 1 },
    ],
  },
];
