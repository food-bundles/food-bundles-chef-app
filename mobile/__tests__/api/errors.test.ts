import { ApiError, responseToApiError, throwToApiError } from '@/api/errors';

function makeResponse(status: number, body: unknown, headers?: Record<string, string>): Response {
  const headersObj = new Headers(headers);
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: headersObj,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('responseToApiError', () => {
  it('maps 401 to auth error', async () => {
    const err = await responseToApiError(makeResponse(401, { detail: 'Token expired.' }));
    expect(err.kind).toBe('auth');
    expect(err.status).toBe(401);
    expect(err.message).toBe('Token expired.');
  });

  it('maps 403 to forbidden', async () => {
    const err = await responseToApiError(makeResponse(403, { detail: 'Not your kitchen.' }));
    expect(err.kind).toBe('forbidden');
    expect(err.status).toBe(403);
  });

  it('maps 404 to not_found', async () => {
    const err = await responseToApiError(makeResponse(404, {}));
    expect(err.kind).toBe('not_found');
  });

  it('maps 409 to conflict', async () => {
    const err = await responseToApiError(makeResponse(409, { detail: 'Duplicate.' }));
    expect(err.kind).toBe('conflict');
  });

  it('maps 422 to validation', async () => {
    const err = await responseToApiError(makeResponse(422, { detail: 'Invalid phone.' }));
    expect(err.kind).toBe('validation');
    expect(err.status).toBe(422);
  });

  it('maps 429 to rate_limit with retryAfterSeconds', async () => {
    const err = await responseToApiError(
      makeResponse(429, { detail: 'Too many requests.' }, { 'Retry-After': '60' })
    );
    expect(err.kind).toBe('rate_limit');
    expect(err.retryAfterSeconds).toBe(60);
  });

  it('maps 500 to server error', async () => {
    const err = await responseToApiError(makeResponse(500, { detail: 'Internal error.' }));
    expect(err.kind).toBe('server');
    expect(err.status).toBe(500);
  });

  it('extracts error_code from body', async () => {
    const err = await responseToApiError(
      makeResponse(422, { detail: 'Bad input.', error_code: 'INVALID_PHONE' })
    );
    expect(err.errorCode).toBe('INVALID_PHONE');
  });

  it('falls back to HTTP status string when body has no detail', async () => {
    const err = await responseToApiError(makeResponse(503, {}));
    expect(err.message).toBe('HTTP 503');
  });

  it('handles non-JSON body gracefully', async () => {
    const response = {
      status: 500,
      ok: false,
      headers: new Headers(),
      json: () => Promise.reject(new SyntaxError('not json')),
    } as unknown as Response;
    const err = await responseToApiError(response);
    expect(err.kind).toBe('server');
    expect(err.message).toBe('HTTP 500');
  });
});

describe('throwToApiError', () => {
  it('returns the same ApiError if already one', () => {
    const original = new ApiError('auth', 'Session expired.');
    expect(throwToApiError(original)).toBe(original);
  });

  it('maps AbortError to transport error', () => {
    const abort = new DOMException('The operation was aborted.', 'AbortError');
    const err = throwToApiError(abort);
    expect(err.kind).toBe('transport');
    expect(err.message).toBe('Request timed out.');
  });

  it('maps a generic Error to transport', () => {
    const err = throwToApiError(new Error('Network request failed'));
    expect(err.kind).toBe('transport');
    expect(err.message).toBe('Network request failed');
  });

  it('maps unknown throw to transport with fallback message', () => {
    const err = throwToApiError('something weird');
    expect(err.kind).toBe('transport');
    expect(err.message).toBe('Network error.');
  });
});

describe('ApiError', () => {
  it('is an instance of Error', () => {
    const err = new ApiError('server', 'Boom');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
  });

  it('carries all optional fields', () => {
    const err = new ApiError('rate_limit', 'Slow down.', {
      status: 429,
      errorCode: 'RATE_LIMITED',
      retryAfterSeconds: 30,
    });
    expect(err.status).toBe(429);
    expect(err.errorCode).toBe('RATE_LIMITED');
    expect(err.retryAfterSeconds).toBe(30);
  });
});
