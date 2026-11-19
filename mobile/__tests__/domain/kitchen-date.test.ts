import { formatSalesTotal } from '@/features/sales/sales-total';
import { kitchenISODate, localISODate } from '@/lib/format';

describe("kitchen's calendar day (decision 8)", () => {
  it('Paris is already on the next day after 23:00 UTC', () => {
    expect(kitchenISODate('Europe/Paris', new Date('2026-11-19T23:30:00Z'))).toBe('2026-11-20');
  });

  it('UTC-5 (Bogota) is still on the previous day at 03:00 UTC', () => {
    expect(kitchenISODate('America/Bogota', new Date('2026-11-20T03:00:00Z'))).toBe('2026-11-19');
  });

  it('Kigali follows its own zone', () => {
    expect(kitchenISODate('Africa/Kigali', new Date('2026-11-19T22:30:00Z'))).toBe('2026-11-20');
  });

  it('falls back to the device day without a usable zone', () => {
    const d = new Date('2026-11-19T12:00:00Z');
    expect(kitchenISODate(undefined, d)).toBe(localISODate(d));
    expect(kitchenISODate('Not/AZone', d)).toBe(localISODate(d));
  });
});

describe('dashboard sales total (review item A4)', () => {
  it('shows one amount per currency and never adds them', () => {
    const text = formatSalesTotal(
      {
        day: '2026-11-19',
        portions: 14,
        revenue: '20.00',
        currency: 'EUR',
        revenue_by_currency: [
          { amount: '20.00', currency: 'EUR' },
          { amount: '35000', currency: 'RWF' },
        ],
        mixed_currencies: true,
      },
      'EUR',
      'en',
    );
    expect(text).toContain('€20.00');
    expect(text).toContain('35,000');
    expect(text).toContain(' + ');
  });

  it('falls back to the single revenue field from older servers', () => {
    expect(formatSalesTotal({ day: '2026-11-19', portions: 1, revenue: '7.99', currency: 'EUR' }, 'EUR', 'en')).toBe('€7.99');
  });
});
