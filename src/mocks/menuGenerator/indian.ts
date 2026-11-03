import type { MenuDish } from '../types';
import { FOODBUNDLES, KIMIRONKO, dishPhoto } from './constants';

export const indianDishes: MenuDish[] = [
  {
    id: 'in-1',
    name: 'Aloo Gobi',
    cuisine: 'INDIAN',
    mealTypes: ['LUNCH', 'DINNER'],
    source: FOODBUNDLES,
    image: dishPhoto('photo-1631452180519-c014fe946bc7'),
    ingredients: [
      { productId: 'irish-potatoes', qty: 1 },
      { productId: 'red-onions', qty: 1 },
      { productId: 'cooking-oil', qty: 1 },
    ],
  },
  {
    id: 'in-2',
    name: 'Tomato & Onion Curry',
    cuisine: 'INDIAN',
    mealTypes: ['LUNCH', 'DINNER', 'ALL_DAY'],
    source: FOODBUNDLES,
    image: dishPhoto('photo-1585937421612-70a008356fbe'),
    ingredients: [
      { productId: 'fresh-tomatoes', qty: 2 },
      { productId: 'red-onions', qty: 1 },
      { productId: 'cooking-oil', qty: 1 },
    ],
  },
  {
    id: 'in-3',
    name: 'Palak Paneer Style Spinach',
    cuisine: 'INDIAN',
    mealTypes: ['DINNER'],
    source: KIMIRONKO,
    image: dishPhoto('photo-1601050690597-df0568f70950'),
    ingredients: [
      { productId: 'spinach', qty: 2 },
      { productId: 'fresh-milk', qty: 1 },
    ],
  },
  {
    id: 'in-4',
    name: 'Egg Bhurji',
    cuisine: 'INDIAN',
    mealTypes: ['BREAKFAST'],
    source: FOODBUNDLES,
    image: dishPhoto('photo-1525351484163-7529414344d8'),
    ingredients: [
      { productId: 'eggs', qty: 1 },
      { productId: 'fresh-tomatoes', qty: 1 },
      { productId: 'red-onions', qty: 1 },
    ],
  },
  {
    id: 'in-5',
    name: 'Carrot & Bean Sabzi',
    cuisine: 'INDIAN',
    mealTypes: ['LUNCH', 'ALL_DAY'],
    source: FOODBUNDLES,
    image: dishPhoto('photo-1512058564366-18510be2db19'),
    ingredients: [
      { productId: 'carrots', qty: 1 },
      { productId: 'green-beans', qty: 1 },
      { productId: 'cooking-oil', qty: 1 },
    ],
  },
  {
    id: 'in-6',
    name: 'Cabbage Sabzi',
    cuisine: 'INDIAN',
    mealTypes: ['LUNCH'],
    source: KIMIRONKO,
    image: dishPhoto('photo-1594282486552-05b4d80fbb9f'),
    ingredients: [
      { productId: 'cabbage', qty: 2 },
      { productId: 'cooking-oil', qty: 1 },
    ],
  },
  {
    id: 'in-7',
    name: 'Rice & Lentil Khichdi Style',
    cuisine: 'INDIAN',
    mealTypes: ['DINNER', 'ALL_DAY'],
    source: FOODBUNDLES,
    image: dishPhoto('photo-1596797038530-2c107229654b'),
    ingredients: [
      { productId: 'rice', qty: 1 },
      { productId: 'red-onions', qty: 1 },
      { productId: 'cooking-oil', qty: 1 },
    ],
  },
  {
    id: 'in-8',
    name: 'Fruit Lassi',
    cuisine: 'INDIAN',
    mealTypes: ['BREAKFAST'],
    source: FOODBUNDLES,
    image: dishPhoto('photo-1553530666-ba11a7da3888'),
    ingredients: [
      { productId: 'bananas', qty: 1 },
      { productId: 'fresh-milk', qty: 1 },
    ],
  },
];
