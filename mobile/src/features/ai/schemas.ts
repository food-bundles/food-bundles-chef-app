import { z } from 'zod';

/** Mirrors backend `app/modules/ai/schemas/gateway.py`. Every AI response is validated against these. */

const confidence = z.number().min(0).max(1);
const category = z.enum(['main', 'side', 'drink', 'dessert']);

export const aiFeaturesSchema = z.object({
  image_classify: z.boolean(),
  menu_scan: z.boolean(),
  dish_analysis: z.boolean(),
  /** Reading line items from a delivery note or receipt (older servers omit it → off). */
  document_scan: z.boolean().optional().default(false),
  assistant: z.boolean(),
  transcription: z.boolean(),
  /** Languages the speech-to-text provider has passed evaluation for. */
  transcription_languages: z.array(z.enum(['en', 'fr', 'rw'])),
});
export type AiFeatures = z.infer<typeof aiFeaturesSchema>;

export const imageKindSchema = z.enum(['menu', 'dish', 'receipt', 'delivery_note', 'stock_shelf', 'other']);
export type ImageKind = z.infer<typeof imageKindSchema>;

export const imageClassificationSchema = z.object({
  /** 'classify_unavailable': the AI could not classify the photo (kind, confidence and
   * image_quality are null) — ask the chef what it is instead of guessing. */
  status: z.enum(['ok', 'classify_unavailable']).default('ok'),
  kind: imageKindSchema.nullable(),
  confidence: confidence.nullable(),
  image_quality: z.enum(['ok', 'too_dark', 'blurry', 'too_small']).nullable(),
  request_id: z.string(),
  prompt_version: z.string(),
});
export type ImageClassification = z.infer<typeof imageClassificationSchema>;

export const menuExtractItemSchema = z.object({
  name: z.string().min(1),
  category: category.nullable(),
  price: z.number().int().nonnegative().nullable(),
  description: z.string().nullable(),
  confidence,
  name_confidence: confidence,
  price_confidence: confidence,
  source_text: z.string().nullable(),
});
export type MenuExtractItem = z.infer<typeof menuExtractItemSchema>;

export const menuExtractionSchema = z.object({
  kind: imageKindSchema,
  items: z.array(menuExtractItemSchema),
  image_quality: z.enum(['ok', 'too_dark', 'blurry', 'too_small']),
  request_id: z.string(),
  prompt_version: z.string(),
});
export type MenuExtraction = z.infer<typeof menuExtractionSchema>;

export const documentLineSchema = z.object({
  name: z.string().min(1),
  /** Decimal string parsed on the server from the document text; null when unreadable. */
  quantity: z.string().nullable(),
  unit: z.string().nullable(),
  unit_price: z.number().int().nonnegative().nullable(),
  line_total: z.number().int().nonnegative().nullable(),
  confidence,
});
export type DocumentLine = z.infer<typeof documentLineSchema>;

export const documentExtractionSchema = z.object({
  kind: imageKindSchema,
  supplier_name: z.string().nullable(),
  document_date: z.string().nullable(),
  lines: z.array(documentLineSchema),
  image_quality: z.enum(['ok', 'too_dark', 'blurry', 'too_small']),
  request_id: z.string(),
  prompt_version: z.string(),
});
export type DocumentExtraction = z.infer<typeof documentExtractionSchema>;

export const dishIngredientSchema = z.object({
  name: z.string().min(1),
  qty_per_portion: z.string(),
  unit: z.string(),
  ingredient_id: z.string().nullable(),
  confidence,
});
export type DishIngredient = z.infer<typeof dishIngredientSchema>;

export const dishPriceSchema = z.object({
  low: z.number().int().nonnegative(),
  high: z.number().int().nonnegative(),
  cost_per_portion: z.number().nonnegative(),
  food_cost_low_pct: z.number(),
  food_cost_high_pct: z.number(),
  costed_ingredients: z.number().int(),
  total_ingredients: z.number().int(),
});
export type DishPrice = z.infer<typeof dishPriceSchema>;

export const dishAnalysisSchema = z.object({
  kind: imageKindSchema,
  dish_name: z.string().nullable(),
  dish_name_confidence: confidence,
  category: category.nullable(),
  category_confidence: confidence,
  ingredients: z.array(dishIngredientSchema),
  price: dishPriceSchema.nullable(),
  price_unavailable_reason: z.enum(['no_matched_costs', 'no_ingredients']).nullable(),
  image_quality: z.enum(['ok', 'too_dark', 'blurry', 'too_small']),
  request_id: z.string(),
  prompt_version: z.string(),
});
export type DishAnalysis = z.infer<typeof dishAnalysisSchema>;
