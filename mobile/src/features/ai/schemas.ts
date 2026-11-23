import { z } from 'zod';

/** Mirrors backend `app/modules/ai/schemas/gateway.py`. Every AI response is validated against these. */

const confidence = z.number().min(0).max(1);
const category = z.enum(['main', 'side', 'drink', 'dessert']);

/** Money on the wire: a decimal string and an ISO 4217 code (never a float). */
export const moneySchema = z.object({ amount: z.string(), currency: z.string() });

const rateSchema = z.object({
  base: z.string(),
  quote: z.string(),
  rate: z.string(),
  rate_date: z.string(),
  source: z.string(),
  cross: z.boolean(),
});

// ── Clarifying questions (Step 2a build step 5): the SERVER decides what to ask ──

export const clarificationKindSchema = z.enum([
  'currency_mismatch',
  'currency_missing',
  'ambiguous_separator',
  'k_suffix',
  'ambiguous_unit',
  'arithmetic_mismatch',
  'unreadable_value',
]);
export type ClarificationKind = z.infer<typeof clarificationKindSchema>;

export const clarifyOptionSchema = z.object({
  /** Sent back as the answer for the question's key. */
  value: z.string(),
  /** i18n key of the option label, with its params. */
  label_key: z.string(),
  params: z.record(z.string()).default({}),
  disabled: z.boolean().default(false),
  disabled_reason_key: z.string().nullable().default(null),
  /** The chef picks a currency or types a pack size; that becomes the answer. */
  input: z.enum(['currency', 'pack_size']).nullable().default(null),
  /** Handled in the app; no answer is sent. */
  action: z.enum(['change_currency', 'edit']).nullable().default(null),
});
export type ClarifyOption = z.infer<typeof clarifyOptionSchema>;

export const clarificationSchema = z.object({
  key: z.string(),
  kind: clarificationKindSchema,
  question_key: z.string(),
  params: z.record(z.string()).default({}),
  options: z.array(clarifyOptionSchema),
  preselected: z.string().nullable().default(null),
  targets: z.array(z.number().int()).default([]),
});
export type Clarification = z.infer<typeof clarificationSchema>;

export const scanAnswersSchema = z.object({
  currency: z.string().nullable().default(null),
  decimal_separator: z.enum(['.', ',']).nullable().default(null),
  k_suffix: z.enum(['yes', 'no']).nullable().default(null),
  mismatch: z.enum(['convert', 'skip']).nullable().default(null),
  rows: z.record(z.string()).default({}),
});
export type ScanAnswers = z.infer<typeof scanAnswersSchema>;

const priceStatusSchema = z.enum(['ok', 'needs_answer', 'none', 'unreadable', 'skipped']);

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
  /** v2: the price as printed, its reading, and (when converted) the original and rate. */
  price_text: z.string().nullable().optional(),
  price_money: moneySchema.nullable().optional(),
  price_original: moneySchema.nullable().optional(),
  price_rate: rateSchema.nullable().optional(),
  price_status: priceStatusSchema.optional(),
});
export type MenuExtractItem = z.infer<typeof menuExtractItemSchema>;

export const menuExtractionSchema = z.object({
  kind: imageKindSchema,
  items: z.array(menuExtractItemSchema),
  image_quality: z.enum(['ok', 'too_dark', 'blurry', 'too_small']),
  request_id: z.string(),
  prompt_version: z.string(),
  currency: z.string().nullable().optional(),
  /** Questions still open: ask the first one, send the answer with model_items to resolve. */
  clarifications: z.array(clarificationSchema).default([]),
  answers: scanAnswersSchema.default({}),
  /** The model's rows, sent back unchanged with each answer (opaque to the app). */
  model_items: z.array(z.record(z.unknown())).default([]),
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
  row: z.number().int().nullable().optional(),
  unit_price_money: moneySchema.nullable().optional(),
  line_total_money: moneySchema.nullable().optional(),
  /** Printed quantity and unit when the server converted them (3 lb → 1.361 kg). */
  original_quantity: z.string().nullable().optional(),
  original_unit: z.string().nullable().optional(),
  unit_status: z.enum(['ok', 'ask', 'unknown']).optional(),
  price_status: priceStatusSchema.optional(),
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
  currency: z.string().nullable().optional(),
  total: moneySchema.nullable().optional(),
  /** Arithmetic is flagged, never corrected: 'mismatch' lists what does not add up. */
  arithmetic: z
    .object({
      status: z.enum(['ok', 'mismatch', 'not_applicable']),
      issues: z.array(
        z.object({
          kind: z.string(),
          row: z.number().int().nullable(),
          label: z.string().nullable(),
          expected: z.string(),
          printed: z.string(),
        }),
      ),
      tax_included: z.boolean(),
      skipped: z.array(z.string()),
    })
    .nullable()
    .optional(),
  clarifications: z.array(clarificationSchema).default([]),
  answers: scanAnswersSchema.default({}),
  /** The model's reading, sent back unchanged with each answer (opaque to the app). */
  model_extraction: z.record(z.unknown()).nullable().optional(),
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
  /** In the kitchen's currency (decimals for EUR, USD, ...); exact values in *_money. */
  low: z.number().nonnegative(),
  high: z.number().nonnegative(),
  currency: z.string().optional(),
  low_money: moneySchema.nullable().optional(),
  high_money: moneySchema.nullable().optional(),
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
