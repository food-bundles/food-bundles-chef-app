import { z } from 'zod';
import { isCurrency } from '@/lib/money';
import { isCountry } from '@/lib/regions';

/** 24-hour "HH:MM". */
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;
/** Error key (translated as kitchens.errors.closingTime), not user-facing text. */
const CLOSING_TIME_ERROR = 'closingTime';

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
  // Service hours (Home's state). Closing is after opening on the same day.
  openingTime: z.string().regex(CLOCK, 'openingTime'),
  closingTime: z.string().regex(CLOCK, 'closingTime'),
}).refine(
  (v) => !CLOCK.test(v.openingTime) || !CLOCK.test(v.closingTime) || v.closingTime > v.openingTime,
  { path: ['closingTime'], message: CLOSING_TIME_ERROR },
);

/** Digits typed into a time field → "HH:MM" as the chef types (a colon after two digits). */
export function sanitiseClockInput(text: string): string {
  const digits = text.replace(/[^0-9]/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
}

export type KitchenFormValues = z.infer<typeof kitchenSchema>;
