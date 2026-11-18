import type { z } from 'zod';
import { API_BASE_URL } from '@/api/config';
import { ApiError } from '@/api/errors';
import { getAccessToken, request } from '@/api/http-client';
import type { PreparedImage } from './image-prep';

/**
 * Every AI failure maps to exactly one of these codes; screens show the matching
 * `ai.errors.<code>` string and never raw server or model text.
 */
export type AiErrorCode =
  | 'offline'
  | 'timeout'
  | 'cancelled'
  | 'unavailable'
  | 'rate_limited'
  | 'too_large'
  | 'too_dark'
  | 'blurry'
  | 'too_small'
  | 'bad_output'
  | 'refused'
  | 'auth'
  | 'server';

export class AiError extends Error {
  readonly code: AiErrorCode;
  readonly requestId?: string;
  readonly retryAfterSeconds?: number;

  constructor(code: AiErrorCode, options?: { requestId?: string; retryAfterSeconds?: number }) {
    super(`AI request failed: ${code}`);
    this.name = 'AiError';
    this.code = code;
    this.requestId = options?.requestId;
    this.retryAfterSeconds = options?.retryAfterSeconds;
  }
}

/**
 * Per-feature time budgets (ms). The server enforces the product budgets (classify 10 s,
 * extract 30 s, chat 30 s, each including its one repair attempt, which gets ≥ 3 s);
 * the client waits a little longer so it never gives up just before a valid answer.
 */
export const AI_TIMEOUTS = {
  classify: 14_000,
  extract: 35_000,
  chat: 40_000,
  transcribe: 30_000,
} as const;

/** Random request ID for tracing a call across app logs and server logs. Not a security token. */
export function newRequestId(): string {
  const hex = (n: number) =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${hex(3)}-${hex(12)}`;
}

function statusToCode(status: number, body: unknown): AiErrorCode {
  const errorCode =
    body && typeof body === 'object' && 'error' in body && body.error && typeof body.error === 'object' && 'code' in body.error
      ? String((body.error as { code: unknown }).code)
      : '';
  if (status === 401 || status === 403) return 'auth';
  if (status === 413) return 'too_large';
  if (status === 429) return 'rate_limited';
  if (status === 503 || errorCode === 'AI_DISABLED') return 'unavailable';
  if (status === 504) return 'timeout';
  if (status === 422 && errorCode === 'AI_BAD_OUTPUT') return 'bad_output';
  // The model declined; the server never retries a refusal on another provider.
  if (status === 422 && errorCode === 'AI_REFUSED') return 'refused';
  return 'server';
}

const RETRYABLE: ReadonlySet<AiErrorCode> = new Set(['offline', 'server']);
const BACKOFF_MS = [800, 2000];

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(id);
        reject(new AiError('cancelled'));
      },
      { once: true },
    );
  });
}

/** Runs an idempotent read with up to 2 retries and exponential backoff on transport/5xx errors. */
async function withRetry<T>(attempt: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await attempt();
    } catch (err) {
      const code = err instanceof AiError ? err.code : 'server';
      const delay = BACKOFF_MS[i];
      if (!RETRYABLE.has(code) || delay === undefined || signal?.aborted) throw err;
      await sleep(delay, signal);
    }
  }
}

export interface AiUploadOptions<T> {
  path: string;
  image: PreparedImage;
  fields?: Record<string, string>;
  /** Input type is `unknown` so schemas with defaults/transforms are accepted. */
  schema: z.ZodType<T, z.ZodTypeDef, unknown>;
  timeoutMs: number;
  language: string;
  signal?: AbortSignal;
  /** Upload progress 0–1. */
  onProgress?: (fraction: number) => void;
  /** Fired once the image is fully sent and the server is analysing. */
  onUploaded?: () => void;
}

interface RawResponse {
  status: number;
  body: unknown;
  retryAfterSeconds?: number;
}

function sendMultipart(
  opts: Omit<AiUploadOptions<unknown>, 'schema'>,
  token: string | null,
  requestId: string,
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}${opts.path}`);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('X-Request-ID', requestId);
    xhr.setRequestHeader('Accept-Language', opts.language);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.timeout = opts.timeoutMs;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) opts.onProgress?.(e.loaded / e.total);
    };
    xhr.upload.onload = () => opts.onUploaded?.();
    xhr.onload = () => {
      let body: unknown = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = null;
      }
      const retryAfter = parseInt(xhr.getResponseHeader('Retry-After') ?? '', 10);
      resolve({ status: xhr.status, body, retryAfterSeconds: Number.isNaN(retryAfter) ? undefined : retryAfter });
    };
    xhr.onerror = () => reject(new AiError('offline', { requestId }));
    xhr.ontimeout = () => reject(new AiError('timeout', { requestId }));
    xhr.onabort = () => reject(new AiError('cancelled', { requestId }));

    if (opts.signal?.aborted) {
      reject(new AiError('cancelled', { requestId }));
      return;
    }
    opts.signal?.addEventListener('abort', () => xhr.abort(), { once: true });

    const form = new FormData();
    form.append('image', { uri: opts.image.uri, name: 'photo.jpg', type: opts.image.mimeType });
    form.append('language', opts.language);
    for (const [key, value] of Object.entries(opts.fields ?? {})) form.append(key, value);
    xhr.send(form);
  });
}

/**
 * Uploads a prepared image to an AI gateway endpoint (multipart, cancellable, with
 * progress), retries transport/5xx failures twice, and validates the JSON response.
 */
export async function aiUpload<T>(opts: AiUploadOptions<T>): Promise<T> {
  const token = await getAccessToken();
  return withRetry(async () => {
    const requestId = newRequestId();
    const res = await sendMultipart(opts, token, requestId);
    if (res.status < 200 || res.status >= 300) {
      throw new AiError(statusToCode(res.status, res.body), { requestId, retryAfterSeconds: res.retryAfterSeconds });
    }
    const parsed = opts.schema.safeParse(res.body);
    if (!parsed.success) throw new AiError('bad_output', { requestId });
    return parsed.data;
  }, opts.signal);
}

/** JSON (non-upload) AI call through the shared client, with a timeout and schema validation. */
export async function aiJson<T>(
  path: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  options: { method?: 'GET' | 'POST'; body?: unknown; timeoutMs: number; signal?: AbortSignal; retry?: boolean },
): Promise<T> {
  const run = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs);
    const onAbort = () => controller.abort();
    options.signal?.addEventListener('abort', onAbort, { once: true });
    try {
      const body = await request<unknown>(path, {
        method: options.method ?? 'GET',
        body: options.body,
        signal: controller.signal,
      });
      const parsed = schema.safeParse(body);
      if (!parsed.success) throw new AiError('bad_output');
      return parsed.data;
    } catch (err) {
      if (err instanceof AiError) throw err;
      if (options.signal?.aborted) throw new AiError('cancelled');
      if (err instanceof ApiError) {
        if (err.kind === 'transport') throw new AiError(controller.signal.aborted ? 'timeout' : 'offline');
        throw new AiError(statusToCode(err.status ?? 500, { error: { code: err.errorCode } }), {
          retryAfterSeconds: err.retryAfterSeconds,
        });
      }
      throw new AiError('server');
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', onAbort);
    }
  };
  return options.retry ? withRetry(run, options.signal) : run();
}
