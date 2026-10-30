/** Generic async operation state using a discriminated union */
export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

/** Price source distinguishes actual prices from reference prices */
export type PriceSource = 'chef-entered' | 'reference';

/** Price record with source provenance */
export interface PriceRecord {
  amount: number;
  currency: string;
  source: PriceSource;
  /** ISO date string for reference prices */
  referenceDate?: string;
}

/** Quality assessment dimension result */
export type QualityResult = 'pass' | 'watch' | 'fail';

/** AI quality assessment for one delivery item */
export interface QualityAssessment {
  /** Advisory score 0–100. Not a verified measurement. */
  score: number;
  freshness: QualityResult;
  ripeness: QualityResult;
  damage: QualityResult;
  spoilage: QualityResult;
  sizeGrade: QualityResult;
  foreignMatter: QualityResult;
  /** Notes from the AI assessment. Advisory only. */
  notes?: string;
  /** null when crate is not fully visible */
  estimatedQuantity: number | null;
}

/** Delivery item acceptance decision */
export type AcceptanceDecision = 'accepted' | 'partially-accepted' | 'rejected';
