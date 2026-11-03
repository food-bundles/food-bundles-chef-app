import type { MenuDish } from '../types';
import { FOODBUNDLES, KIMIRONKO, dishPhoto } from './constants';

export const mediterraneanDishes: MenuDish[] = [
  {
    id: 'me-1',
    name: 'Tomato & Onion Salad',
    cuisine: 'MEDITERRANEAN',
    mealTypes: ['LUNCH', 'ALL_DAY'],
    source: KIMIRONKO,
    image: dishPhoto('photo-1540420773420-3366772f4999'),
    ingredients: [
      { productId: 'fresh-tomatoes', qty: 2 },
      { productId: 'red-onions', qty: 1 },
      { productId: 'cooking-oil', qty: 1 },
    ],
  },
  {
    id: 'me-2',
    name: 'Avocado & Egg Plate',
    cuisine: 'MEDITERRANEAN',
    mealTypes: ['BREAKFAST'],
    source: FOODBUNDLES,
    image: dishPhoto('photo-1525351484163-7529414344d8'),
    ingredients: [
      { productId: 'avocados', qty: 1 },
      { productId: 'eggs', qty: 1 },
    ],
  },
  {
    id: 'me-3',
    name: 'Braised Green Beans',
    cuisine: 'MEDITERRANEAN',
    mealTypes: ['DINNER'],
    source: FOODBUNDLES,
    image: dishPhoto('photo-1615485500704-8e990f9900f7'),
    ingredients: [
      { productId: 'green-beans', qty: 2 },
      { productId: 'fresh-tomatoes', qty: 1 },
      { productId: 'cooking-oil', qty: 1 },
    ],
  },
  {
    id: 'me-4',
    name: 'Potato & Carrot Bake',
    cuisine: 'MEDITERRANEAN',
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
    id: 'me-5',
    name: 'Cabbage & Tomato Braise',
    cuisine: 'MEDITERRANEAN',
    mealTypes: ['DINNER', 'ALL_DAY'],
    source: KIMIRONKO,
    image: dishPhoto('photo-1594282486552-05b4d80fbb9f'),
    ingredients: [
      { productId: 'cabbage', qty: 2 },
      { productId: 'fresh-tomatoes', qty: 1 },
    ],
  },
  {
    id: 'me-6',
    name: 'Milk & Banana Breakfast Bowl',
    cuisine: 'MEDITERRANEAN',
    mealTypes: ['BREAKFAST'],
    source: FOODBUNDLES,
    image: dishPhoto('photo-1517673400267-0251440c45dc'),
    ingredients: [
      { productId: 'fresh-milk', qty: 1 },
      { productId: 'bananas', qty: 2 },
    ],
  },
  {
    id: 'me-7',
    name: 'Rice & Spinach Pilaf',
    cuisine: 'MEDITERRANEAN',
    mealTypes: ['LUNCH', 'DINNER'],
    source: FOODBUNDLES,
    image: dishPhoto('photo-1596797038530-2c107229654b'),
    ingredients: [
      { productId: 'rice', qty: 1 },
      { productId: 'spinach', qty: 1 },
      { productId: 'cooking-oil', qty: 1 },
    ],
  },
  {
    id: 'me-8',
    name: 'Onion & Egg Skillet',
    cuisine: 'MEDITERRANEAN',
    mealTypes: ['BREAKFAST', 'ALL_DAY'],
    source: FOODBUNDLES,
    image: dishPhoto('photo-1510693206972-df098062cb71'),
    ingredients: [
      { productId: 'red-onions', qty: 1 },
      { productId: 'eggs', qty: 1 },
    ],
  },
];
