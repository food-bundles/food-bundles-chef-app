import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './config';
import { responseToApiError, throwToApiError } from './errors';
import { getAccessToken } from './http-client';

// ── DTOs ──────────────────────────────────────────────────────────────────────

export type QualityResult = 'pass' | 'watch' | 'fail';

export interface QualityDimensionResult {
  dimension: string;
  result: QualityResult;
  confidence: number;
  notes: string | null;
}

export interface QuantityEstimate {
  /** null when crate is not fully visible */
  estimated_quantity: string | null;
  unit: string | null;
  confidence: number;
  crate_fully_visible: boolean;
}

export interface QualityAssessmentResponseDto {
  dimensions: QualityDimensionResult[];
  quantity_estimate: QuantityEstimate | null;
  provider: string;
  model_id: string;
  latency_ms: number | null;
}

export interface TranscriptionResponseDto {
  text: string;
  confidence: number;
  provider: string;
  model_id: string;
  latency_ms: number | null;
}

// ── API calls ─────────────────────────────────────────────────────────────────

/**
 * Upload a JPEG photo and get an advisory quality assessment.
 *
 * Returns 503 when AI is disabled — callers MUST handle this gracefully
 * by falling back to manual entry. The chef must confirm all values;
 * this call never creates any record.
 *
 * Image must be ≤ 1 MB (compress before calling).
 */
export async function assessQuality(
  kitchenId: string,
  photoUri: string,
  productName: string,
  expectedUnit: string,
): Promise<QualityAssessmentResponseDto> {
  // Use FormData — this endpoint accepts multipart/form-data
  const form = new FormData();
  form.append('product_name', productName);
  form.append('expected_unit', expectedUnit);
  form.append('image', {
    uri: photoUri,
    name: 'item.jpg',
    type: 'image/jpeg',
  });

  return _postMultipart<QualityAssessmentResponseDto>(
    `/kitchens/${kitchenId}/ai/quality-assess`,
    form,
  );
}

/**
 * Transcribe an audio clip to text (speech-to-text only).
 *
 * Returns 503 when AI is disabled.
 * Transcribed text is returned to the form field for chef review —
 * it does not submit any record directly.
 */
export async function transcribeAudio(
  kitchenId: string,
  audioUri: string,
  language: 'en' | 'fr' | 'rw',
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<TranscriptionResponseDto> {
  const form = new FormData();
  form.append('language', language);
  // expo-audio HIGH_QUALITY preset records AAC in an .m4a container.
  form.append('audio', { uri: audioUri, name: 'voice.m4a', type: 'audio/mp4' });

  return _postMultipart<TranscriptionResponseDto>(`/kitchens/${kitchenId}/ai/transcribe`, form, options);
}

// ── Internal multipart helper ─────────────────────────────────────────────────
// Cannot use the standard request() helper because it only handles JSON.
// Auth token injection replicates http-client behaviour: reads from TokenProvider.

async function _postMultipart<T>(
  path: string,
  form: FormData,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<T> {
  const token = await getAccessToken();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? REQUEST_TIMEOUT_MS);
  options.signal?.addEventListener('abort', () => controller.abort(), { once: true });

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw await responseToApiError(response);
    }

    return (await response.json()) as T;
  } catch (err) {
    throw throwToApiError(err);
  } finally {
    clearTimeout(timer);
  }
}
