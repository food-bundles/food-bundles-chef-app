import type { QualityAssessment, QualityResult } from '@/types';

/** Typed interface for the AI quality assessment service */
export interface QualityAdapterInterface {
  assessPhoto(photoUri: string, ingredientName: string): Promise<QualityAssessment>;
}

function randomResult(): QualityResult {
  const r = Math.random();
  if (r < 0.7) return 'pass';
  if (r < 0.9) return 'watch';
  return 'fail';
}

/**
 * Mock AI quality assessment adapter.
 * Returns simulated quality results — never calls a real AI endpoint.
 * The chef's manual entry always overrides any AI estimate.
 *
 * IMPORTANT: AI assessments are advisory only.
 * estimatedQuantity is null when the crate is not fully visible.
 */
export const mockQualityAdapter: QualityAdapterInterface = {
  async assessPhoto(_photoUri: string, _ingredientName: string): Promise<QualityAssessment> {
    // Simulate network latency
    await new Promise((r) => setTimeout(r, 1200));

    const dimensions: Array<keyof Omit<QualityAssessment, 'score' | 'notes' | 'estimatedQuantity'>> = [
      'freshness', 'ripeness', 'damage', 'spoilage', 'sizeGrade', 'foreignMatter',
    ];

    const results = Object.fromEntries(
      dimensions.map((d) => [d, randomResult()]),
    ) as Pick<QualityAssessment, 'freshness' | 'ripeness' | 'damage' | 'spoilage' | 'sizeGrade' | 'foreignMatter'>;

    const failCount = Object.values(results).filter((v) => v === 'fail').length;
    const watchCount = Object.values(results).filter((v) => v === 'watch').length;
    const score = Math.max(0, Math.round(100 - failCount * 25 - watchCount * 10));

    return {
      ...results,
      score,
      notes: failCount > 0 ? 'Some quality issues detected. Please inspect carefully.' : undefined,
      // Null when item not fully visible — never guess
      estimatedQuantity: Math.random() > 0.2 ? Math.round(Math.random() * 20 + 5) : null,
    };
  },
};
