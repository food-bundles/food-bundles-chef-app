import type { DataConsent } from './types';

/**
 * Seed consent state: FoodBundles' own transaction history is always granted
 * (no restaurant consent required); every third-party source starts ungranted.
 */
export const dataConsentSeed: DataConsent[] = [
  { source: 'eucl', granted: false, grantedAt: null, expiresAt: null },
  { source: 'rra', granted: false, grantedAt: null, expiresAt: null },
  { source: 'vubaVuba', granted: false, grantedAt: null, expiresAt: null },
  { source: 'kayko', granted: false, grantedAt: null, expiresAt: null },
  { source: 'foodbundles', granted: true, grantedAt: null, expiresAt: null },
  { source: 'creditBureau', granted: false, grantedAt: null, expiresAt: null },
];
