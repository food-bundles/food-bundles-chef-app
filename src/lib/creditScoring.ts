import type { CreditScore, CreditTier, DataConsent, DataConsentSource } from '@/mocks/types';

/** Base credit line from FoodBundles' own transaction history alone — always included, no authorization needed. */
export const BASE_LIMIT_RWF = 60_000;

/** Additional limit each third-party source contributes once authorized. */
export const SOURCE_CONTRIBUTION: Record<Exclude<DataConsentSource, 'foodbundles'>, number> = {
  eucl: 25_000,
  rra: 50_000,
  vubaVuba: 30_000,
  kayko: 20_000,
  creditBureau: 15_000,
};

/** The 5 third-party sources a restaurant can opt into on the consent screen. */
export const TOGGLEABLE_SOURCES: Exclude<DataConsentSource, 'foodbundles'>[] = [
  'eucl',
  'rra',
  'vubaVuba',
  'kayko',
  'creditBureau',
];

const SOURCE_WEIGHT: Record<DataConsentSource, number> = {
  rra: 0.3,
  vubaVuba: 0.2,
  kayko: 0.15,
  eucl: 0.1,
  creditBureau: 0.1,
  foodbundles: 0.15,
};

/** Maps a computed limit to its qualification tier, per the 60k/120k/180k thresholds. */
function limitToTier(limitRwf: number): CreditTier {
  if (limitRwf >= 180_000) return 'A';
  if (limitRwf >= 120_000) return 'B';
  if (limitRwf >= 60_000) return 'C';
  return 'D';
}

/**
 * Computes a mock qualification score from the restaurant's granted data-consent
 * sources. Mirrors the KYC white paper's category weighting at a simplified,
 * client-side level — the real composite model and its live data sources run
 * server-side and are out of scope for this mocked client.
 */
export function computeScore(consentList: DataConsent[]): CreditScore {
  const grantedSources = new Set(consentList.filter((c) => c.granted).map((c) => c.source));
  const scoreBreakdown = TOGGLEABLE_SOURCES.filter((source) => grantedSources.has(source)).map((source) => ({
    source: source as DataConsentSource,
    weight: SOURCE_WEIGHT[source],
    contribution: SOURCE_CONTRIBUTION[source],
  }));

  const limitRwf = BASE_LIMIT_RWF + scoreBreakdown.reduce((sum, entry) => sum + entry.contribution, 0);

  return { tier: limitToTier(limitRwf), limitRwf, scoreBreakdown };
}
