import type { MenuDish } from '../types';
import { FOODBUNDLES, KIMIRONKO, dishPhoto } from './constants';

export const westernDishes: MenuDish[] = [
  {
    id: 'we-1',
    name: 'Roast Potato & Carrot Plate',
    cuisine: 'WESTERN',
    mealTypes: ['LUNCH', 'DINNER'],
    source: FOODBUNDLES,
    image: dishPhoto('photo-1598103442097-8b74394b95c6'),
    ingredients: [
      { productId: 'irish-potatoes', qty: 1 },
      { productId: 'carrots', qty: 1 },
      { productId: 'cooking-oil', qty: 1 },
    ],
  },
  {
    id: 'we-2',
    name: 'Garden Salad',
    cuisine: 'WESTERN',
    mealTypes: ['LUNCH', 'ALL_DAY'],
    source: KIMIRONKO,
    image: dishPhoto('photo-1540420773420-3366772f4999'),
    ingredients: [
      { productId: 'fresh-tomatoes', qty: 1 },
      { productId: 'avocados', qty: 1 },
      { productId: 'cabbage', qty: 1 },
    ],
  },
  {
    id: 'we-3',
    name: 'Omelette & Greens',
    cuisine: 'WESTERN',
    mealTypes: ['BREAKFAST'],
    source: FOODBUNDLES,
    image: dishPhoto('photo-1510693206972-df098062cb71'),
    ingredients: [
      { productId: 'eggs', qty: 1 },
      { productId: 'spinach', qty: 1 },
    ],
  },
  {
    id: 'we-4',
    name: 'Green Bean & Onion Saute',
    cuisine: 'WESTERN',
    mealTypes: ['DINNER'],
    source: FOODBUNDLES,
    image: dishPhoto('photo-1615485500704-8e990f9900f7'),
    ingredients: [
      { productId: 'green-beans', qty: 1 },
      { productId: 'red-onions', qty: 1 },
      { productId: 'cooking-oil', qty: 1 },
    ],
  },
  {
    id: 'we-5',
    name: 'Banana Pancakes',
    cuisine: 'WESTERN',
    mealTypes: ['BREAKFAST'],
    source: FOODBUNDLES,
    image: dishPhoto('photo-1528207776546-365bb710ee93'),
    ingredients: [
      { productId: 'bananas', qty: 2 },
      { productId: 'fresh-milk', qty: 1 },
      { productId: 'eggs', qty: 1 },
    ],
  },
  {
    id: 'we-6',
    name: 'Beef & Rice Bowl',
    cuisine: 'WESTERN',
    mealTypes: ['LUNCH', 'DINNER'],
    source: FOODBUNDLES,
    image: dishPhoto('photo-1512058564366-18510be2db19'),
    ingredients: [
      { productId: 'rice', qty: 1 },
      { productId: 'carrots', qty: 1 },
      { productId: 'cooking-oil', qty: 1 },
    ],
  },
  {
    id: 'we-7',
    name: 'Milk & Avocado Smoothie',
    cuisine: 'WESTERN',
    mealTypes: ['BREAKFAST', 'ALL_DAY'],
    source: KIMIRONKO,
    image: dishPhoto('photo-1623065422902-30a2d299bbe4'),
    ingredients: [
      { productId: 'avocados', qty: 1 },
      { productId: 'fresh-milk', qty: 1 },
    ],
  },
  {
    id: 'we-8',
    name: 'Tomato & Onion Soup',
    cuisine: 'WESTERN',
    mealTypes: ['DINNER', 'ALL_DAY'],
    source: FOODBUNDLES,
    image: dishPhoto('photo-1546554137-f86b9593d2a1'),
    ingredients: [
      { productId: 'fresh-tomatoes', qty: 2 },
      { productId: 'red-onions', qty: 1 },
    ],
  },
];
