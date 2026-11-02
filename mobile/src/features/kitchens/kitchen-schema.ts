import { z } from 'zod';

export const kitchenSchema = z.object({
  name: z
    .string()
    .min(2, 'Kitchen name must be at least 2 characters')
    .max(60, 'Kitchen name must be 60 characters or fewer')
    .trim(),
  address: z.string().max(120, 'Address too long').trim().optional().or(z.literal('')),
  cuisineType: z
    .string()
    .max(40, 'Cuisine type too long')
    .trim()
    .optional()
    .or(z.literal('')),
  seatingCapacity: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^\d+$/.test(v),
      'Seating capacity must be a whole number',
    )
    .refine(
      (v) => !v || parseInt(v, 10) <= 2000,
      'Seating capacity cannot exceed 2,000',
    ),
});

export type KitchenFormValues = z.infer<typeof kitchenSchema>;
