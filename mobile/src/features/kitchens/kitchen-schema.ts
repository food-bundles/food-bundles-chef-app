import { z } from 'zod';
import { isCurrency } from '@/lib/money';
import { isCountry } from '@/lib/regions';

export const kitchenSchema = z.object({
  name: z
    .string()
    .min(2, 'Kitchen name must be at least 2 characters')
    .max(60, 'Kitchen name must be 60 characters or fewer')
    .trim(),
  // location (city) is required — #18
  cuisineType: z
    .string()
    .min(1, 'City or location is required')
    .max(40, 'Location too long')
    .trim(),
  address: z.string().max(120, 'Address too long').trim().optional().or(z.literal('')),
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
  // Chosen by the chef (device suggestions preselected); no country is assumed.
  country: z.string().refine((v) => isCountry(v), 'country'),
  currency: z.string().refine((v) => isCurrency(v), 'currency'),
  timezone: z.string().min(1, 'timezone'),
});

export type KitchenFormValues = z.infer<typeof kitchenSchema>;
