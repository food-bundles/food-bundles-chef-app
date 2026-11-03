import type { MenuDish } from '../types';
import { FOODBUNDLES, KIMIRONKO, dishPhoto } from './constants';

export const africanDishes: MenuDish[] = [
  {
    id: 'af-1',
    name: 'Isombe with Fish',
    cuisine: 'AFRICAN',
    mealTypes: ['LUNCH', 'DINNER'],
    source: FOODBUNDLES,
    image: dishPhoto('photo-1604329760661-e71dc83f8f26'),
    ingredients: [
      { productId: 'spinach', qty: 2 },
      { productId: 'red-onions', qty: 1 },
      { productId: 'cooking-oil', qty: 1 },
    ],
  },
  {
    id: 'af-2',
    name: 'Ugali with Beans',
    cuisine: 'AFRICAN',
    mealTypes: ['LUNCH', 'DINNER', 'ALL_DAY'],
    source: FOODBUNDLES,
    image: dishPhoto('photo-1585937421612-70a008356fbe'),
    ingredients: [
      { productId: 'red-onions', qty: 1 },
      { productId: 'carrots', qty: 1 },
      { productId: 'cooking-oil', qty: 1 },
    ],
  },
  {
    id: 'af-3',
    name: 'Grilled Chicken & Avocado Salad',
    cuisine: 'AFRICAN',
    mealTypes: ['LUNCH', 'DINNER'],
    source: KIMIRONKO,
    image: dishPhoto('photo-1598515214211-89d3c73ae83b'),
    ingredients: [
      { productId: 'avocados', qty: 1 },
      { productId: 'fresh-tomatoes', qty: 1 },
      { productId: 'red-onions', qty: 1 },
    ],
  },
  {
    id: 'af-4',
    name: 'Rice & Beef Stew',
    cuisine: 'AFRICAN',
    mealTypes: ['LUNCH', 'DINNER'],
    source: FOODBUNDLES,
    image: dishPhoto('photo-1604908176997-125f25cc6f3d'),
    ingredients: [
      { productId: 'rice', qty: 1 },
      { productId: 'fresh-tomatoes', qty: 1 },
      { productId: 'red-onions', qty: 1 },
      { productId: 'cooking-oil', qty: 1 },
    ],
  },
  {
    id: 'af-5',
    name: 'Sweet Banana Porridge',
    cuisine: 'AFRICAN',
    mealTypes: ['BREAKFAST'],
    source: FOODBUNDLES,
    image: dishPhoto('photo-1517673400267-0251440c45dc'),
    ingredients: [
      { productId: 'bananas', qty: 2 },
      { productId: 'fresh-milk', qty: 1 },
    ],
  },
  {
    id: 'af-6',
    name: 'Cabbage & Carrot Stir Fry',
    cuisine: 'AFRICAN',
    mealTypes: ['LUNCH', 'ALL_DAY'],
    source: FOODBUNDLES,
    image: dishPhoto('photo-1512058564366-18510be2db19'),
    ingredients: [
      { productId: 'cabbage', qty: 2 },
      { productId: 'carrots', qty: 1 },
      { productId: 'cooking-oil', qty: 1 },
    ],
  },
  {
    id: 'af-7',
    name: 'Egg & Green Bean Breakfast Plate',
    cuisine: 'AFRICAN',
    mealTypes: ['BREAKFAST'],
    source: FOODBUNDLES,
    image: dishPhoto('photo-1525351484163-7529414344d8'),
    ingredients: [
      { productId: 'eggs', qty: 1 },
      { productId: 'green-beans', qty: 1 },
    ],
  },
  {
    id: 'af-8',
    name: 'Potato & Spinach Curry',
    cuisine: 'AFRICAN',
    mealTypes: ['DINNER', 'ALL_DAY'],
    source: KIMIRONKO,
    image: dishPhoto('photo-1631452180519-c014fe946bc7'),
    ingredients: [
      { productId: 'irish-potatoes', qty: 1 },
      { productId: 'spinach', qty: 2 },
      { productId: 'cooking-oil', qty: 1 },
    ],
  },
];
