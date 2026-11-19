import { readFileSync } from 'fs';
import { join } from 'path';
import {
  currencyName,
  formatMoney,
  formatMoneyFallback,
  fromMinorUnits,
  isCurrency,
  minorUnits,
  priceableCurrencies,
  toMinorUnits,
} from '@/lib/money';
import { kitchenSchema } from '@/features/kitchens/kitchen-schema';
import { countryZones, isCountry } from '@/lib/regions';

describe('ISO 4217 table', () => {
  it('is the same file as the backend copy', () => {
    const mobile = readFileSync(join(__dirname, '../../src/lib/iso4217.json'), 'utf8');
    const backend = readFileSync(join(__dirname, '../../../backend/app/shared/data/iso4217.json'), 'utf8');
    expect(mobile.replace(/\r\n/g, '\n')).toBe(backend.replace(/\r\n/g, '\n'));
  });

  it('gives each currency its own decimal places (no Rwanda special case)', () => {
    expect(minorUnits('RWF')).toBe(0);
    expect(minorUnits('UGX')).toBe(0);
    expect(minorUnits('USD')).toBe(2);
    expect(minorUnits('EUR')).toBe(2);
    expect(minorUnits('KES')).toBe(2);
    expect(minorUnits('NGN')).toBe(2);
    expect(minorUnits('KWD')).toBe(3);
  });

  it('excludes fund codes from kitchen currencies', () => {
    expect(isCurrency('EUR')).toBe(true);
    expect(isCurrency('BOV')).toBe(false);
    expect(isCurrency('XYZ')).toBe(false);
    expect(priceableCurrencies()).toContain('RWF');
    expect(priceableCurrencies()).not.toContain('BOV');
  });
});

describe('formatMoney', () => {
  it('formats RWF without decimals and EUR with two', () => {
    expect(formatMoney(3500, 'RWF', 'en')).toMatch(/3,500/);
    expect(formatMoney(3500, 'RWF', 'en')).not.toMatch(/\./);
    expect(formatMoney('7.9', 'EUR', 'en')).toMatch(/7\.90/);
    expect(formatMoney('7.99', 'EUR', 'fr')).toMatch(/7,99/);
  });

  it('shows a dash for missing amounts', () => {
    expect(formatMoney(null, 'USD')).toBe('—');
    expect(formatMoney('abc', 'USD')).toBe('—');
  });

  it('has a fallback for devices without Intl currency data', () => {
    expect(formatMoneyFallback(3500, 'RWF')).toBe('3,500 RWF');
    expect(formatMoneyFallback(1234.5, 'USD')).toBe('1,234.50 USD');
    expect(formatMoneyFallback(-1.5, 'KWD')).toBe('-1.500 KWD');
  });

  it('names currencies', () => {
    expect(currencyName('EUR', 'en').toLowerCase()).toContain('euro');
  });
});

describe('minor units', () => {
  it('converts exactly, never rounding a typed amount', () => {
    expect(toMinorUnits('7.99', 'USD')).toBe(799);
    expect(toMinorUnits('3500', 'RWF')).toBe(3500);
    expect(toMinorUnits('1500.5', 'RWF')).toBeNull(); // RWF has no decimals
    expect(toMinorUnits('7.995', 'USD')).toBeNull();
    expect(fromMinorUnits(799, 'USD')).toBe('7.99');
    expect(fromMinorUnits(5, 'USD')).toBe('0.05');
    expect(fromMinorUnits(3500, 'RWF')).toBe('3500');
  });
});

describe('kitchen region', () => {
  const base = { name: 'Chez Ama', cuisineType: 'Paris', address: '', seatingCapacity: '' };

  it('requires a real country, currency and time zone', () => {
    expect(kitchenSchema.safeParse({ ...base, country: 'FR', currency: 'EUR', timezone: 'Europe/Paris' }).success).toBe(true);
    expect(kitchenSchema.safeParse({ ...base, country: '', currency: 'EUR', timezone: 'Europe/Paris' }).success).toBe(false);
    expect(kitchenSchema.safeParse({ ...base, country: 'FR', currency: 'XYZ', timezone: 'Europe/Paris' }).success).toBe(false);
    expect(kitchenSchema.safeParse({ ...base, country: 'FR', currency: 'EUR', timezone: '' }).success).toBe(false);
  });

  it('knows countries and their zones from the IANA tables', () => {
    expect(isCountry('RW')).toBe(true);
    expect(isCountry('ZZ')).toBe(false);
    expect(countryZones('FR')).toContain('Europe/Paris');
  });
});
