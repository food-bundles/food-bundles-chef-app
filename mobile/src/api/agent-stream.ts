/**
 * Step 1b: stream one Assistant turn (POST /kitchens/{id}/ai/agent/stream, Server-Sent Events).
 *
 * The server sends `delta` events with more of the reply text, then one `done` event with the
 * same AgentResponse as POST /agent, or an `error` event. It fails over to the fallback
 * provider only before the first delta; after that a failure arrives as
 * AI_STREAM_INTERRUPTED and the app offers Retry.
 *
 * XMLHttpRequest is used because its progress events expose the body as it arrives on both
 * iOS and Android (React Native's fetch does not stream response bodies).
 */
import { API_BASE_URL } from './config';
import { getAccessToken } from './http-client';
import type { AgentRequest, AgentResponse } from './agent-api';
import { AiError, type AiErrorCode } from '@/features/ai/ai-client';

/** The server has no streaming endpoint (older deployment): use POST /agent instead. */
export class StreamUnsupportedError extends Error {
  constructor() {
    super('agent streaming not supported by the server');
    this.name = 'StreamUnsupportedError';
  }
}

export interface StreamAgentOptions {
  signal?: AbortSignal;
  requestId: string;
  language: string;
  /** Called with each new piece of the reply text. */
  onDelta: (text: string) => void;
}

/** Server error code → app error code (the same i18n messages as POST /agent). */
export function streamErrorCode(code: string): AiErrorCode {
  switch (code) {
    case 'AI_STREAM_INTERRUPTED':
      return 'interrupted';
    case 'AI_REFUSED':
      return 'refused';
    case 'AI_DISABLED':
    case 'AI_UNAVAILABLE':
      return 'unavailable';
    case 'AI_TIMEOUT':
      return 'timeout';
    case 'AI_RATE_LIMITED':
    case 'RATE_LIMIT_EXCEEDED':
    case 'AI_BUDGET_EXCEEDED':
      return 'rate_limited';
    case 'AI_BAD_OUTPUT':
      return 'bad_output';
    case 'AI_IMAGE_INVALID':
      return 'too_large';
    default:
      return 'server';
  }
}

export interface SseEvent {
  event: string;
  data: string;
}

/**
 * Incremental SSE parser: feed the whole body received so far; returns the complete events
 * not returned before. Partial events stay buffered until their blank line arrives.
 */
export class SseParser {
  private consumed = 0;

  feed(body: string): SseEvent[] {
    const events: SseEvent[] = [];
    let end = body.indexOf('\n\n', this.consumed);
    while (end !== -1) {
      const block = body.slice(this.consumed, end);
      this.consumed = end + 2;
      let event = 'message';
      const data: string[] = [];
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
      }
      if (data.length) events.push({ event, data: data.join('\n') });
      end = body.indexOf('\n\n', this.consumed);
    }
    return events;
  }
}

/** Stream one turn; resolves with the validated AgentResponse. Rejects with AiError. */
export async function streamAgentTurn(
  kitchenId: string,
  body: AgentRequest,
  opts: StreamAgentOptions,
): Promise<AgentResponse> {
  const token = await getAccessToken();
  return new Promise<AgentResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const parser = new SseParser();
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    const handle = (events: SseEvent[]) => {
      for (const ev of events) {
        if (settled) return;
        let payload: unknown;
        try {
          payload = JSON.parse(ev.data);
        } catch {
          continue;
        }
        if (ev.event === 'delta' && payload && typeof payload === 'object' && 'text' in payload) {
          opts.onDelta(String((payload as { text: unknown }).text));
        } else if (ev.event === 'done') {
          finish(() => resolve(payload as AgentResponse));
          xhr.abort();
        } else if (ev.event === 'error') {
          const code = payload && typeof payload === 'object' && 'code' in payload ? String((payload as { code: unknown }).code) : '';
          finish(() => reject(new AiError(streamErrorCode(code), { requestId: opts.requestId })));
          xhr.abort();
        }
      }
    };

    xhr.open('POST', `${API_BASE_URL}/kitchens/${kitchenId}/ai/agent/stream`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Accept', 'text/event-stream');
    xhr.setRequestHeader('X-Request-ID', opts.requestId);
    xhr.setRequestHeader('Accept-Language', opts.language);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.onprogress = () => {
      if (xhr.status === 200) handle(parser.feed(xhr.responseText));
    };
    xhr.onload = () => {
      if (xhr.status === 404) return finish(() => reject(new StreamUnsupportedError()));
      if (xhr.status === 401 || xhr.status === 403) return finish(() => reject(new AiError('auth', { requestId: opts.requestId })));
      if (xhr.status === 429) return finish(() => reject(new AiError('rate_limited', { requestId: opts.requestId })));
      if (xhr.status !== 200) return finish(() => reject(new AiError('server', { requestId: opts.requestId })));
      handle(parser.feed(xhr.responseText));
      // The body ended without `done` or `error`: the connection broke mid-answer.
      finish(() => reject(new AiError('interrupted', { requestId: opts.requestId })));
    };
    xhr.onerror = () => finish(() => reject(new AiError('offline', { requestId: opts.requestId })));
    xhr.onabort = () => finish(() => reject(new AiError('cancelled', { requestId: opts.requestId })));

    if (opts.signal) {
      if (opts.signal.aborted) {
        finish(() => reject(new AiError('cancelled', { requestId: opts.requestId })));
        return;
      }
      opts.signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }
    xhr.send(JSON.stringify(body));
  });
}
