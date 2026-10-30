/** Measurement unit for an ingredient */
export type MeasurementUnit =
  | 'kg'
  | 'g'
  | 'L'
  | 'mL'
  | 'unit'
  | 'bunch'
  | 'crate'
  | 'bag'
  | 'tray'
  | 'portion';

/** Represents a canonical ingredient in the catalog */
export interface Ingredient {
  id: string;
  name: string;
  category: string;
  stockUnit: MeasurementUnit;
  purchaseUnit: MeasurementUnit;
  /** Conversion factor: 1 purchaseUnit = X stockUnits */
  unitConversionFactor: number;
}

/** Current stock record for one ingredient in one kitchen */
export interface IngredientStock {
  ingredientId: string;
  kitchenId: string;
  currentStock: number;
  unit: MeasurementUnit;
  /** Estimated daily use based on sales data */
  expectedDailyUse: number;
  lastUpdated: string;
}
