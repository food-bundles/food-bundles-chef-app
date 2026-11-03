import type { MenuDish } from '../types';
import { FOODBUNDLES, KIMIRONKO, dishPhoto } from './constants';

export const fusionDishes: MenuDish[] = [
  {
    id: 'fu-1',
    name: 'Avocado Fried Rice',
    cuisine: 'FUSION',
    mealTypes: ['LUNCH', 'DINNER'],
    source: FOODBUNDLES,
    image: dishPhoto('photo-1512621776951-a57141f2eefd'),
    ingredients: [
      { productId: 'rice', qty: 1 },
      { productId: 'avocados', qty: 1 },
      { productId: 'cooking-oil', qty: 1 },
    ],
  },
  {
    id: 'fu-2',
    name: 'Spinach & Egg Wrap Style',
    cuisine: 'FUSION',
    mealTypes: ['BREAKFAST', 'LUNCH'],
    source: FOODBUNDLES,
    image: dishPhoto('photo-1585032226651-759b368d7246'),
    ingredients: [
      { productId: 'spinach', qty: 1 },
      { productId: 'eggs', qty: 1 },
    ],
  },
  {
    id: 'fu-3',
    name: 'Curry Potato Salad',
    cuisine: 'FUSION',
    mealTypes: ['LUNCH', 'ALL_DAY'],
    source: KIMIRONKO,
    image: dishPhoto('photo-1631452180519-c014fe946bc7'),
    ingredients: [
      { productId: 'irish-potatoes', qty: 1 },
      { productId: 'red-onions', qty: 1 },
      { productId: 'cooking-oil', qty: 1 },
    ],
  },
  {
    id: 'fu-4',
    name: 'Tomato & Cabbage Slaw',
    cuisine: 'FUSION',
    mealTypes: ['LUNCH'],
    source: FOODBUNDLES,
    image: dishPhoto('photo-1540420773420-3366772f4999'),
    ingredients: [
      { productId: 'fresh-tomatoes', qty: 1 },
      { productId: 'cabbage', qty: 1 },
    ],
  },
  {
    id: 'fu-5',
    name: 'Banana Milk Oats',
    cuisine: 'FUSION',
    mealTypes: ['BREAKFAST'],
    source: FOODBUNDLES,
    image: dishPhoto('photo-1517673400267-0251440c45dc'),
    ingredients: [
      { productId: 'bananas', qty: 2 },
      { productId: 'fresh-milk', qty: 1 },
    ],
  },
  {
    id: 'fu-6',
    name: 'Carrot & Green Bean Medley',
    cuisine: 'FUSION',
    mealTypes: ['DINNER', 'ALL_DAY'],
    source: FOODBUNDLES,
    image: dishPhoto('photo-1512058564366-18510be2db19'),
    ingredients: [
      { productId: 'carrots', qty: 1 },
      { productId: 'green-beans', qty: 1 },
      { productId: 'cooking-oil', qty: 1 },
    ],
  },
  {
    id: 'fu-7',
    name: 'Onion & Rice Skillet',
    cuisine: 'FUSION',
    mealTypes: ['DINNER'],
    source: KIMIRONKO,
    image: dishPhoto('photo-1596797038530-2c107229654b'),
    ingredients: [
      { productId: 'red-onions', qty: 1 },
      { productId: 'rice', qty: 1 },
      { productId: 'cooking-oil', qty: 1 },
    ],
  },
  {
    id: 'fu-8',
    name: 'Avocado & Tomato Toast Bowl',
    cuisine: 'FUSION',
    mealTypes: ['BREAKFAST', 'ALL_DAY'],
    source: FOODBUNDLES,
    image: dishPhoto('photo-1623065422902-30a2d299bbe4'),
    ingredients: [
      { productId: 'avocados', qty: 1 },
      { productId: 'fresh-tomatoes', qty: 1 },
    ],
  },
];
