import { kitchenSchema, sanitiseClockInput } from '@/features/kitchens/kitchen-schema';
import { formatDayShort } from '@/lib/format';

const base = {
  name: 'Food Court',
  cuisineType: 'Kigali',
  address: '',
  seatingCapacity: '',
  country: 'RW',
  currency: 'RWF',
  timezone: 'Africa/Kigali',
};

describe('kitchen service hours', () => {
  it('accepts the spec sample hours 11:00–22:00', () => {
    expect(kitchenSchema.safeParse({ ...base, openingTime: '11:00', closingTime: '22:00' }).success).toBe(true);
  });

  it('rejects closing at or before opening, on the closing field', () => {
    for (const closingTime of ['11:00', '10:30']) {
      const r = kitchenSchema.safeParse({ ...base, openingTime: '11:00', closingTime });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.issues[0]?.path).toEqual(['closingTime']);
    }
  });

  it.each(['24:00', '7:00', '1100', '', '11:60'])('rejects the malformed time %p', (openingTime) => {
    expect(kitchenSchema.safeParse({ ...base, openingTime, closingTime: '22:00' }).success).toBe(false);
  });

  it('inserts the colon as the chef types digits', () => {
    expect(sanitiseClockInput('1')).toBe('1');
    expect(sanitiseClockInput('11')).toBe('11');
    expect(sanitiseClockInput('110')).toBe('11:0');
    expect(sanitiseClockInput('1100')).toBe('11:00');
    expect(sanitiseClockInput('11:00')).toBe('11:00');
    expect(sanitiseClockInput('22h30x9')).toBe('22:30');
  });
});

describe('formatDayShort (Home date line)', () => {
  it('shows weekday, day and month like the mockup ("Wed 18 Nov")', () => {
    expect(formatDayShort('2026-11-18', 'en')).toBe('Wed 18 Nov');
  });

  it('uses day/month in Kinyarwanda', () => {
    expect(formatDayShort('2026-11-18', 'rw')).toBe('18/11');
  });

  it('is not shifted by the device time zone', () => {
    expect(formatDayShort('2026-11-01', 'en')).toBe('Sun 1 Nov');
  });

  it('shows a dash for a malformed day', () => {
    expect(formatDayShort('18-11-2026', 'en')).toBe('—');
  });
});
