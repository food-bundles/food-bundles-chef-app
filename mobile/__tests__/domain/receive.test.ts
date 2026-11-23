import {
  afterWeighing,
  checkedCount,
  isShortWeight,
  parseReceived,
  receivingPayload,
  type ReceiveLine,
} from '@/domain/rules/receive';

const line = (id: string, ordered: number, received: string, over: Partial<ReceiveLine> = {}): ReceiveLine => ({
  orderLineId: id,
  ordered,
  received,
  quality: null,
  reasons: [],
  ...over,
});

// Mockup p.4 (FB-2418): 6 items, carrots not weighed yet.
const MOCKUP = [
  line('chicken', 5, '5.0', { quality: 'good' }),
  line('banana', 10, '10.0', { quality: 'good' }),
  line('potatoes', 8, '7.0', { quality: 'issue', reasons: ['short_weight'] }),
  line('rice', 5, '5.0', { quality: 'good' }),
  line('onions', 2, '2.0', { quality: 'good' }),
  line('carrots', 1, ''),
];

describe('receive delivery (screen 04)', () => {
  it('counts "5 of 6 checked"', () => {
    expect(checkedCount(MOCKUP)).toEqual({ checked: 5, total: 6 });
  });

  it('starts empty: nothing is checked until the chef weighs', () => {
    expect(checkedCount([line('a', 5, ''), line('b', 1, '')])).toEqual({ checked: 0, total: 2 });
  });

  it('suggests Issue · Short weight for potatoes 7.0 of 8 kg', () => {
    expect(isShortWeight(8, 7)).toBe(true);
    expect(afterWeighing(line('potatoes', 8, '7.0'))).toEqual({ quality: 'issue', reasons: ['short_weight'] });
  });

  it('5 % below is not short (boundary)', () => {
    expect(isShortWeight(100, 95)).toBe(false);
    expect(isShortWeight(100, 94.99)).toBe(true);
  });

  it('a full weight is Good, but keeps an Issue the chef chose (damaged)', () => {
    expect(afterWeighing(line('chicken', 5, '5'))).toEqual({ quality: 'good', reasons: [] });
    expect(afterWeighing(line('chicken', 5, '5', { quality: 'issue', reasons: ['damaged', 'short_weight'] }))).toEqual({
      quality: 'issue',
      reasons: ['damaged'],
    });
  });

  it('accepts a comma decimal', () => {
    expect(parseReceived('7,5')).toBe(7.5);
    expect(parseReceived('')).toBeNull();
    expect(parseReceived('-1')).toBeNull();
  });

  it('sends unchecked lines as not received, others with their quality', () => {
    const payload = receivingPayload(MOCKUP);
    expect(payload.find((p) => p.order_line_id === 'carrots')).toEqual({
      order_line_id: 'carrots',
      quantity_received: '0',
      decision: 'rejected',
      rejection_reason: 'not_received',
    });
    expect(payload.find((p) => p.order_line_id === 'potatoes')).toEqual({
      order_line_id: 'potatoes',
      quantity_received: '7',
      decision: 'accepted',
      quality: 'issue',
      issue_reasons: ['short_weight'],
    });
  });

  it('confirms Chicken 5.0 kg into "In"', () => {
    expect(receivingPayload([MOCKUP[0] as ReceiveLine])[0]).toMatchObject({ quantity_received: '5', quality: 'good' });
  });
});
