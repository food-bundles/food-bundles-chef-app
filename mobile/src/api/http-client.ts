import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './config';
import { ApiError, responseToApiError, throwToApiError } from './errors';

/**
 * Callbacks the HTTP client calls to read/write tokens.
 * Provided by the session store at app startup.
 */
export interface TokenProvider {
  getAccessToken(): Promise<string | null>;
  getRefreshToken(): Promise<string | null>;
  /** Called with new tokens after a transparent refresh. */
  onTokensRefreshed(accessToken: string, refreshToken: string): Promise<void>;
  /** Called when refresh fails — session should be cleared. */
  onAuthFailure(): Promise<void>;
}

let _tokenProvider: TokenProvider | null = null;

/** Called once at app startup (from session store init). */
export function setTokenProvider(provider: TokenProvider): void {
  _tokenProvider = provider;
}

/** Read the current access token (used by multipart callers that bypass request()). */
export function getAccessToken(): Promise<string | null> {
  return _tokenProvider?.getAccessToken() ?? Promise.resolve(null);
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Skip auth header injection (used by login/OTP endpoints). */
  skipAuth?: boolean;
  /** Skip the transparent 401 refresh retry (used by refresh endpoint itself). */
  skipRefresh?: boolean;
  signal?: AbortSignal;
}

/**
 * Core fetch wrapper. All API calls go through here.
 *
 * - Prepends API_BASE_URL
 * - Sets Content-Type: application/json and Accept: application/json
 * - Injects Authorization: Bearer <access_token> unless skipAuth
 * - Enforces REQUEST_TIMEOUT_MS via AbortController
 * - On 401 (and !skipRefresh): attempts one transparent token refresh, then retries
 * - Maps all errors to typed ApiError
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, skipAuth = false, skipRefresh = false, signal } = options;

  const accessToken = skipAuth ? null : (await _tokenProvider?.getAccessToken()) ?? null;

  const response = await executeRequest(path, method, body, accessToken, signal);

  // Transparent refresh on 401
  if (response.status === 401 && !skipAuth && !skipRefresh && _tokenProvider) {
    const refreshToken = await _tokenProvider.getRefreshToken();
    if (refreshToken) {
      try {
        const refreshed = await refreshAccessToken(refreshToken);
        await _tokenProvider.onTokensRefreshed(refreshed.access_token, refreshed.refresh_token);
        const retryResponse = await executeRequest(path, method, body, refreshed.access_token, signal);
        if (!retryResponse.ok) throw await responseToApiError(retryResponse);
        return (await retryResponse.json()) as T;
      } catch (err) {
        await _tokenProvider.onAuthFailure();
        throw err instanceof ApiError ? err : new ApiError('auth', 'Session expired. Please log in again.');
      }
    } else {
      await _tokenProvider.onAuthFailure();
      throw new ApiError('auth', 'Session expired. Please log in again.', { status: 401 });
    }
  }

  if (!response.ok) throw await responseToApiError(response);
  // 204 No Content
  if (response.status === 204) return undefined as unknown as T;
  return (await response.json()) as T;
}

async function executeRequest(
  path: string,
  method: string,
  body: unknown,
  accessToken: string | null,
  externalSignal?: AbortSignal
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  // Combine external signal with our timeout signal
  if (externalSignal) {
    externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    return response;
  } catch (err) {
    throw throwToApiError(err);
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Inline token refresh — avoids circular import with auth-api.ts */
async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}/auth/token/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
      signal: controller.signal,
    });
    if (!response.ok) throw await responseToApiError(response);
    return (await response.json()) as { access_token: string; refresh_token: string };
  } catch (err) {
    throw err instanceof ApiError ? err : throwToApiError(err);
  } finally {
    clearTimeout(timeoutId);
  }
}
