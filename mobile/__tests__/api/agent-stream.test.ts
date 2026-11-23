import { SseParser, streamErrorCode } from '@/api/agent-stream';

describe('SseParser (Step 1b)', () => {
  it('returns complete events and buffers a partial one', () => {
    const parser = new SseParser();
    let body = 'event: delta\ndata: {"text": "You have"}\n\nevent: delta\ndata: {"text": " 1.9';
    expect(parser.feed(body)).toEqual([{ event: 'delta', data: '{"text": "You have"}' }]);
    body += ' kg"}\n\nevent: done\ndata: {"reply_text": "x"}\n\n';
    expect(parser.feed(body)).toEqual([
      { event: 'delta', data: '{"text": " 1.9 kg"}' },
      { event: 'done', data: '{"reply_text": "x"}' },
    ]);
  });

  it('never returns the same event twice', () => {
    const parser = new SseParser();
    const body = 'event: delta\ndata: {"text": "a"}\n\n';
    expect(parser.feed(body)).toHaveLength(1);
    expect(parser.feed(body)).toHaveLength(0);
  });

  it('ignores blocks without data', () => {
    expect(new SseParser().feed(': keep-alive\n\n')).toEqual([]);
  });
});

describe('streamErrorCode', () => {
  it.each([
    ['AI_STREAM_INTERRUPTED', 'interrupted'],
    ['AI_REFUSED', 'refused'],
    ['AI_DISABLED', 'unavailable'],
    ['AI_UNAVAILABLE', 'unavailable'],
    ['AI_TIMEOUT', 'timeout'],
    ['AI_RATE_LIMITED', 'rate_limited'],
    ['AI_BAD_OUTPUT', 'bad_output'],
    ['SOMETHING_ELSE', 'server'],
  ])('%s → %s', (code, expected) => {
    expect(streamErrorCode(code)).toBe(expected);
  });
});
