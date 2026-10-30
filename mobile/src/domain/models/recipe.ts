export interface RecipeIngredient {
  ingredientId: string;
  ingredientName: string;
  quantityPerPortion: number;
  unit: string;
}

export interface Recipe {
  id: string;
  kitchenId: string;
  menuItemId: string;
  menuItemName: string;
  portions: number;
  ingredients: RecipeIngredient[];
  notes?: string;
  createdAt: string;
}
