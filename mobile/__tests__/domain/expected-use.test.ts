import {
  calcExpectedPortions,
  calcExpectedDailyUse,
  calcDaysOfCover,
  isLowStock,
} from '../../src/domain/calculations/expected-use';

describe('calcExpectedPortions', () => {
  it('computes weighted average with safety buffer', () => {
    const result = calcExpectedPortions({ week0: 100, week1: 80, week2: 90, week3: 70 });
    // weighted = 100*0.4 + 80*0.2 + 90*0.2 + 70*0.2 = 40+16+18+14 = 88
    // with 10% buffer = 88 * 1.1 = 96.8 → ceil = 97
    expect(result).toBe(97);
  });

  it('treats missing weeks as zero', () => {
    const result = calcExpectedPortions({ week0: 100 });
    // weighted = 100*0.4 = 40; with buffer = 44 → ceil = 44
    expect(result).toBe(44);
  });

  it('returns 0 when all weeks are zero', () => {
    expect(calcExpectedPortions({})).toBe(0);
  });

  it('rounds up fractional expected portions', () => {
    // 10 * 0.4 = 4; * 1.1 = 4.4 → ceil = 5
    expect(calcExpectedPortions({ week0: 10 })).toBe(5);
  });
});

describe('calcExpectedDailyUse', () => {
  it('calculates expected daily use correctly', () => {
    // 700 / 7 = 100 portions/day; 100 * 0.2 / 0.8 = 25
    expect(calcExpectedDailyUse(700, 7, 0.2, 0.8)).toBeCloseTo(25);
  });

  it('defaults yield to 1.0 when not provided', () => {
    // 70 / 7 = 10; 10 * 2 / 1 = 20
    expect(calcExpectedDailyUse(70, 7, 2)).toBe(20);
  });

  it('returns 0 for zero weekly sales', () => {
    expect(calcExpectedDailyUse(0, 7, 0.5, 0.9)).toBe(0);
  });

  it('throws for non-positive daysOpen', () => {
    expect(() => calcExpectedDailyUse(100, 0, 1)).toThrow(RangeError);
    expect(() => calcExpectedDailyUse(100, -1, 1)).toThrow(RangeError);
  });

  it('throws for non-positive yield percentage', () => {
    expect(() => calcExpectedDailyUse(100, 7, 1, 0)).toThrow(RangeError);
    expect(() => calcExpectedDailyUse(100, 7, 1, -0.1)).toThrow(RangeError);
  });

  it('handles very high yield (> 1) without error', () => {
    // Unusual but should not throw
    expect(() => calcExpectedDailyUse(100, 7, 1, 1.05)).not.toThrow();
  });
});

describe('calcDaysOfCover', () => {
  it('divides stock by daily use', () => {
    expect(calcDaysOfCover(10, 2)).toBe(5);
  });

  it('returns Infinity when expected use is 0', () => {
    expect(calcDaysOfCover(100, 0)).toBe(Infinity);
  });

  it('returns Infinity when expected use is negative', () => {
    expect(calcDaysOfCover(100, -1)).toBe(Infinity);
  });

  it('returns 0 when stock is 0', () => {
    expect(calcDaysOfCover(0, 5)).toBe(0);
  });
});

describe('isLowStock', () => {
  it('flags items below 1 day of cover', () => {
    expect(isLowStock(4, 5)).toBe(true);
  });

  it('does not flag items at exactly 1 day of cover', () => {
    expect(isLowStock(5, 5)).toBe(false);
  });

  it('does not flag items above 1 day of cover', () => {
    expect(isLowStock(10, 5)).toBe(false);
  });

  it('does not flag items when expected use is 0', () => {
    expect(isLowStock(0, 0)).toBe(false);
  });
});
