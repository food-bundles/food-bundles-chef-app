import { useQuery } from '@tanstack/react-query';
import { request } from '@/api/http-client';
import { useKitchenStore } from '@/store/kitchen-store';
import { AI_TIMEOUTS, aiJson, aiUpload } from './ai-client';
import type { PreparedImage } from './image-prep';
import {
  aiFeaturesSchema,
  dishAnalysisSchema,
  documentExtractionSchema,
  imageClassificationSchema,
  menuExtractionSchema,
  type AiFeatures,
  type DishAnalysis,
  type DocumentExtraction,
  type ImageClassification,
  type MenuExtraction,
  type ScanAnswers,
} from './schemas';

export interface UploadCallbacks {
  signal: AbortSignal;
  onProgress: (fraction: number) => void;
  onUploaded: () => void;
}

/** Server-side kill switches. Defaults to everything off until the server answers. */
export const AI_FEATURES_OFF: AiFeatures = {
  image_classify: false,
  menu_scan: false,
  dish_analysis: false,
  document_scan: false,
  assistant: false,
  transcription: false,
  transcription_languages: [],
};

export function fetchAiFeatures(kitchenId: string): Promise<AiFeatures> {
  return aiJson(`/kitchens/${kitchenId}/ai/features`, aiFeaturesSchema, { timeoutMs: 10_000, retry: true });
}

/**
 * Which AI features are switched on for the active kitchen (remote kill switches).
 * Everything reads as off until the server answers; `isError` means the switches
 * could not be read (usually offline), so screens can say so instead of "disabled".
 */
export function useAiFeatures(): {
  features: AiFeatures;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
} {
  const kitchenId = useKitchenStore((s) => s.activeKitchen?.id ?? '');
  const query = useQuery({
    queryKey: ['ai-features', kitchenId],
    queryFn: () => fetchAiFeatures(kitchenId),
    enabled: Boolean(kitchenId),
    staleTime: 5 * 60_000,
    retry: false,
  });
  return {
    features: query.data ?? AI_FEATURES_OFF,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => void query.refetch(),
  };
}

export function classifyImage(
  kitchenId: string,
  image: PreparedImage,
  language: string,
  cb: UploadCallbacks,
): Promise<ImageClassification> {
  return aiUpload({
    path: `/kitchens/${kitchenId}/ai/classify-image`,
    image,
    language,
    schema: imageClassificationSchema,
    timeoutMs: AI_TIMEOUTS.classify,
    ...cb,
  });
}

export function extractMenu(
  kitchenId: string,
  image: PreparedImage,
  language: string,
  cb: UploadCallbacks,
): Promise<MenuExtraction> {
  return aiUpload({
    path: `/kitchens/${kitchenId}/ai/menu-extract`,
    image,
    language,
    schema: menuExtractionSchema,
    timeoutMs: AI_TIMEOUTS.extract,
    ...cb,
  });
}

export interface AiFeedback {
  /** The request id of the AI call this outcome belongs to. */
  request_id: string;
  feature: 'assistant' | 'menu_scan' | 'dish_analysis' | 'document_scan';
  outcome: 'user_confirmed' | 'user_edited' | 'user_rejected' | 'user_imported';
  accepted?: number;
  suggested?: number;
}

/**
 * Tell the server what the chef did with an AI result (quality monitoring). Carries
 * ids, the outcome and counts only — never content. Fire-and-forget: failures are ignored.
 */
export function sendAiFeedback(kitchenId: string, feedback: AiFeedback): void {
  if (!kitchenId || !feedback.request_id) return;
  void request<void>(`/kitchens/${kitchenId}/ai/feedback`, { method: 'POST', body: feedback }).catch(() => undefined);
}

/** Line items from a delivery note / receipt photo, for review in Log Delivery. */
export function extractDocument(
  kitchenId: string,
  image: PreparedImage,
  language: string,
  cb: UploadCallbacks,
): Promise<DocumentExtraction> {
  return aiUpload({
    path: `/kitchens/${kitchenId}/ai/document-extract`,
    image,
    language,
    schema: documentExtractionSchema,
    timeoutMs: AI_TIMEOUTS.extract,
    ...cb,
  });
}

export function analyzeDish(
  kitchenId: string,
  image: PreparedImage,
  language: string,
  nameHint: string,
  cb: UploadCallbacks,
): Promise<DishAnalysis> {
  return aiUpload({
    path: `/kitchens/${kitchenId}/ai/dish-analyze`,
    image,
    language,
    fields: nameHint ? { name_hint: nameHint } : undefined,
    schema: dishAnalysisSchema,
    timeoutMs: AI_TIMEOUTS.extract,
    ...cb,
  });
}

/**
 * Re-read a scanned menu with the chef's answers to the server's questions. No model call
 * (instant, not counted against AI limits); the model's rows are sent back unchanged.
 */
export function resolveMenu(kitchenId: string, extraction: MenuExtraction, answers: ScanAnswers): Promise<MenuExtraction> {
  return aiJson(`/kitchens/${kitchenId}/ai/menu-extract/resolve`, menuExtractionSchema, {
    method: 'POST',
    body: {
      request_id: extraction.request_id,
      kind: extraction.kind,
      image_quality: extraction.image_quality,
      items: extraction.model_items,
      answers,
    },
    timeoutMs: AI_TIMEOUTS.classify,
  });
}

/** Re-read a scanned delivery note or receipt with the chef's answers (no model call). */
export function resolveDocument(
  kitchenId: string,
  extraction: DocumentExtraction,
  answers: ScanAnswers,
): Promise<DocumentExtraction> {
  return aiJson(`/kitchens/${kitchenId}/ai/document-extract/resolve`, documentExtractionSchema, {
    method: 'POST',
    body: { request_id: extraction.request_id, extraction: extraction.model_extraction, answers },
    timeoutMs: AI_TIMEOUTS.classify,
  });
}
