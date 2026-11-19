import type { CurrencyChangePreviewDto } from '@/api/kitchens-api';
import type { RateDto } from '@/api/money-dto';
import {
  canApplyCurrencyChange,
  currencyChangeBody,
  formatRate,
  sanitiseCostInput,
  trimDecimalZeros,
} from '@/features/kitchens/currency-change';
import { formatUnitCost } from '@/lib/money';

const rate: RateDto = {
  base: 'RWF',
  quote: 'EUR',
  rate: '0.0006',
  rate_date: '2026-11-18',
  source: 'frankfurter',
  cross: true,
};

function preview(over: Partial<CurrencyChangePreviewDto> = {}): CurrencyChangePreviewDto {
  return {
    from_currency: 'RWF',
    to_currency: 'EUR',
    mode: 'convert',
    rate,
    rate_unavailable: false,
    history: { sales: 0, orders: 0, stock_entries: 0, deliveries: 0, has_history: false },
    prices: [],
    can_apply: true,
    blocked_reason: null,
    confirmation_text: null,
    price_step_reset: false,
    ...over,
  };
}

describe('currency change', () => {
  it('convert can apply only with a rate from the preview', () => {
    expect(canApplyCurrencyChange(preview(), '')).toBe(true);
    expect(canApplyCurrencyChange(preview({ rate: null, can_apply: false, rate_unavailable: true }), '')).toBe(false);
    expect(canApplyCurrencyChange(undefined, '')).toBe(false);
  });

  it('relabel needs the new code typed (case and spaces ignored)', () => {
    const p = preview({ mode: 'relabel', rate: null, confirmation_text: 'EUR' });
    expect(canApplyCurrencyChange(p, '')).toBe(false);
    expect(canApplyCurrencyChange(p, 'yes')).toBe(false);
    expect(canApplyCurrencyChange(p, ' eur ')).toBe(true);
    expect(canApplyCurrencyChange({ ...p, can_apply: false }, 'EUR')).toBe(false);
  });

  it('convert sends back exactly the previewed rate and date', () => {
    expect(currencyChangeBody(preview(), '')).toEqual({
      to_currency: 'EUR',
      mode: 'convert',
      rate: '0.0006',
      rate_date: '2026-11-18',
    });
    expect(currencyChangeBody(preview({ mode: 'relabel', confirmation_text: 'EUR' }), ' EUR ')).toEqual({
      to_currency: 'EUR',
      mode: 'relabel',
      confirmation: 'EUR',
    });
  });

  it('formats a rate with its pair', () => {
    expect(formatRate(rate, 'en')).toBe('1 RWF = 0.0006 EUR');
    expect(formatRate({ ...rate, base: 'EUR', quote: 'RWF', rate: '1624.552276' }, 'en')).toBe('1 EUR = 1,624.55 RWF');
  });
});

describe('unit cost input and display', () => {
  it('keeps decimals (up to 6) and accepts a comma', () => {
    expect(sanitiseCostInput('0,00125')).toBe('0.00125');
    expect(sanitiseCostInput('12.3456789')).toBe('12.345678');
    expect(sanitiseCostInput('3 500 RWF')).toBe('3500');
    expect(sanitiseCostInput('1.2.3')).toBe('1.23');
  });

  it('trims only zeros after a decimal point', () => {
    expect(trimDecimalZeros('3500')).toBe('3500');
    expect(trimDecimalZeros('8.00')).toBe('8');
    expect(trimDecimalZeros('0.001250')).toBe('0.00125');
  });

  it('shows small unit costs instead of rounding them to zero', () => {
    expect(formatUnitCost('0.00125', 'USD', 'en')).toBe('$0.00125');
    expect(formatUnitCost('8', 'USD', 'en')).toBe('$8.00');
    expect(formatUnitCost(null, 'USD', 'en')).toBe('—');
  });
});
