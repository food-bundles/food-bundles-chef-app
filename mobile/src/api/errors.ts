/**
 * Typed error hierarchy for the API transport layer.
 *
 * All errors that cross the API boundary are one of these classes.
 * Callers switch on `instanceof` or `error.kind` — never on HTTP status codes.
 */

/** Discriminator union so callers can switch without instanceof */
export type ApiErrorKind =
  | 'transport'    // network failure, timeout, DNS
  | 'auth'         // 401 Unauthorized
  | 'forbidden'    // 403 Forbidden
  | 'not_found'    // 404 Not Found
  | 'validation'   // 422 Unprocessable Entity — request shape wrong
  | 'rate_limit'   // 429 Too Many Requests
  | 'conflict'     // 409 Conflict — server-side state conflict
  | 'server';      // 5xx or unknown

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  /** HTTP status code when available */
  readonly status?: number;
  /** Backend error_code string when present in the response body */
  readonly errorCode?: string;
  /** Retry-After seconds from 429 response header */
  readonly retryAfterSeconds?: number;

  constructor(
    kind: ApiErrorKind,
    message: string,
    options?: {
      status?: number;
      errorCode?: string;
      retryAfterSeconds?: number;
      cause?: unknown;
    }
  ) {
    super(message, options?.cause != null ? { cause: options.cause } : undefined);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = options?.status;
    this.errorCode = options?.errorCode;
    this.retryAfterSeconds = options?.retryAfterSeconds;
  }
}

/** Maps a fetch Response to a typed ApiError. */
export async function responseToApiError(response: Response): Promise<ApiError> {
  let body: Record<string, unknown> = {};
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    // body not JSON — proceed with empty
  }

  const errorCode = typeof body['error_code'] === 'string' ? body['error_code'] : undefined;
  const detail =
    typeof body['detail'] === 'string'
      ? body['detail']
      : typeof body['message'] === 'string'
        ? body['message']
        : `HTTP ${response.status}`;

  const retryAfterSeconds = parseRetryAfter(response.headers.get('Retry-After'));

  const status = response.status;
  switch (true) {
    case status === 401:
      return new ApiError('auth', detail, { status, errorCode });
    case status === 403:
      return new ApiError('forbidden', detail, { status, errorCode });
    case status === 404:
      return new ApiError('not_found', detail, { status, errorCode });
    case status === 409:
      return new ApiError('conflict', detail, { status, errorCode });
    case status === 422:
      return new ApiError('validation', detail, { status, errorCode });
    case status === 429:
      return new ApiError('rate_limit', detail, { status, errorCode, retryAfterSeconds });
    case status >= 500:
      return new ApiError('server', detail, { status, errorCode });
    default:
      return new ApiError('server', detail, { status, errorCode });
  }
}

/** Maps a fetch throw (network error, abort) to ApiError. */
export function throwToApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof DOMException && err.name === 'AbortError') {
    return new ApiError('transport', 'Request timed out.', { cause: err });
  }
  const message = err instanceof Error ? err.message : 'Network error.';
  return new ApiError('transport', message, { cause: err });
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = parseInt(header, 10);
  return isNaN(seconds) ? undefined : seconds;
}
