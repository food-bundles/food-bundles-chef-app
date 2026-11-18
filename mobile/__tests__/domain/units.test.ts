import { convertUnit, canConvert, conversionHint } from '@/domain/calculations/units';

describe('canConvert', () => {
  it('returns true for same family', () => {
    expect(canConvert('kg', 'g')).toBe(true);
    expect(canConvert('L', 'ml')).toBe(true);
    expect(canConvert('piece', 'pieces')).toBe(true);
  });

  it('returns false across families', () => {
    expect(canConvert('kg', 'ml')).toBe(false);
    expect(canConvert('L', 'g')).toBe(false);
    expect(canConvert('piece', 'kg')).toBe(false);
  });

  it('returns false for unknown units', () => {
    expect(canConvert('furlongs', 'kg')).toBe(false);
    expect(canConvert('kg', 'parsecs')).toBe(false);
  });
});

describe('convertUnit', () => {
  // identity
  it('returns same value for identical units', () => {
    expect(convertUnit(5, 'kg', 'kg')).toBe(5);
    expect(convertUnit(0, 'ml', 'ml')).toBe(0);
  });

  // mass conversions
  it('converts kg → g', () => expect(convertUnit(1, 'kg', 'g')).toBe(1000));
  it('converts g → kg', () => expect(convertUnit(500, 'g', 'kg')).toBe(0.5));
  it('converts kg → mg', () => expect(convertUnit(1, 'kg', 'mg')).toBe(1_000_000));
  it('converts mg → g', () => expect(convertUnit(1000, 'mg', 'g')).toBe(1));

  // volume conversions
  it('converts L → ml', () => expect(convertUnit(2, 'L', 'ml')).toBe(2000));
  it('converts ml → L', () => expect(convertUnit(500, 'ml', 'L')).toBe(0.5));

  // discrete — same base, ratio 1
  it('converts piece → pieces (1:1)', () => expect(convertUnit(3, 'piece', 'pieces')).toBe(3));

  // zero
  it('handles zero quantity', () => expect(convertUnit(0, 'kg', 'g')).toBe(0));

  // fractional
  it('handles fractional kg', () => expect(convertUnit(0.25, 'kg', 'g')).toBe(250));

  // throws across families
  it('throws for incompatible units', () => {
    expect(() => convertUnit(1, 'kg', 'ml')).toThrow();
    expect(() => convertUnit(1, 'g', 'piece')).toThrow();
  });
});

describe('conversionHint', () => {
  it('returns hint for kg → g', () =>
    expect(conversionHint('kg', 'g')).toBe('1 kg = 1,000 g'));

  it('returns hint for L → ml', () =>
    expect(conversionHint('L', 'ml')).toBe('1 L = 1,000 ml'));

  it('returns empty string for same unit', () =>
    expect(conversionHint('kg', 'kg')).toBe(''));

  it('returns empty string for incompatible families', () =>
    expect(conversionHint('kg', 'ml')).toBe(''));
});
