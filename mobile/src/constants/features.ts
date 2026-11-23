/**
 * App feature flags (Phase 9: the app follows the Food Bundles UX spec).
 *
 * Features outside the spec are kept in the code but hidden from the main flow. These are
 * build-time switches, not secrets: EXPO_PUBLIC_* values are embedded in the app bundle.
 */
function flag(value: string | undefined, fallback: boolean): boolean {
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return fallback;
}

export const FEATURES = {
  /** Kitchen Assistant chat: Profile → Assistant. Off by default (not in the spec). */
  assistant: flag(process.env.EXPO_PUBLIC_FEATURE_ASSISTANT, false),
  /** Delivery tracking map in receiving. Off (not in the spec). */
  deliveryMap: flag(process.env.EXPO_PUBLIC_FEATURE_DELIVERY_MAP, false),
} as const;
