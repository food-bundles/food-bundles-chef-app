import { imageClassificationSchema } from '@/features/ai/schemas';
import { entryToMessages } from '@/features/agent/build-history';
import { chatEntrySchema, type ChatEntry } from '@/features/agent/chat-types';
import { PICKABLE_KINDS } from '@/features/ai/PhotoKindPicker';

describe('image classification result', () => {
  it('parses a normal classification and defaults status to ok', () => {
    const parsed = imageClassificationSchema.parse({
      kind: 'menu',
      confidence: 0.93,
      image_quality: 'ok',
      request_id: 'r1',
      prompt_version: 'classify_image.v1',
    });
    expect(parsed.status).toBe('ok');
    expect(parsed.kind).toBe('menu');
  });

  it('parses classify_unavailable with null kind, confidence and quality', () => {
    const parsed = imageClassificationSchema.parse({
      status: 'classify_unavailable',
      kind: null,
      confidence: null,
      image_quality: null,
      request_id: 'r2',
      prompt_version: 'classify_image.v1',
    });
    expect(parsed.status).toBe('classify_unavailable');
    expect(parsed.kind).toBeNull();
  });

  it('rejects an unknown status', () => {
    expect(() =>
      imageClassificationSchema.parse({
        status: 'maybe',
        kind: null,
        confidence: null,
        image_quality: null,
        request_id: 'r3',
        prompt_version: 'v',
      }),
    ).toThrow();
  });
});

describe('photo kind picker rows', () => {
  it('offers exactly menu, dish and delivery note', () => {
    expect([...PICKABLE_KINDS]).toEqual(['menu', 'dish', 'delivery_note']);
  });

  it('persists a pick row with the chosen kind', () => {
    const row: ChatEntry = { type: 'pick', id: 'p1', chosen: 'dish' };
    expect(chatEntrySchema.parse(row)).toEqual(row);
  });

  it('never sends pick rows to the model', () => {
    expect(entryToMessages({ type: 'pick', id: 'p2', imageUri: 'file://x.jpg' })).toEqual([]);
  });
});
