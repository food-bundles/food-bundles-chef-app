import {
  calcQuantityToBuy,
  isShortDelivery,
  calcShortfallFraction,
} from '../../src/domain/calculations/purchasing';

describe('calcQuantityToBuy', () => {
  it('returns number of purchase units needed', () => {
    // Need 30 kg, have 10 kg, 1 crate = 5 kg → need 20 kg → 4 crates
    expect(calcQuantityToBuy(30, 10, 5)).toBe(4);
  });

  it('rounds up to whole purchase units', () => {
    // Need 11 kg, have 0, 1 crate = 5 kg → ceil(11/5) = 3 crates
    expect(calcQuantityToBuy(11, 0, 5)).toBe(3);
  });

  it('returns 0 when stock covers requirement', () => {
    expect(calcQuantityToBuy(10, 15, 1)).toBe(0);
  });

  it('returns 0 when stock exactly meets requirement', () => {
    expect(calcQuantityToBuy(10, 10, 1)).toBe(0);
  });

  it('defaults purchase unit size to 1', () => {
    expect(calcQuantityToBuy(8.5, 0)).toBe(9);
  });

  it('throws for non-positive purchaseUnitSize', () => {
    expect(() => calcQuantityToBuy(10, 0, 0)).toThrow(RangeError);
    expect(() => calcQuantityToBuy(10, 0, -1)).toThrow(RangeError);
  });
});

describe('isShortDelivery', () => {
  it('flags delivery as short when shortfall exceeds 5%', () => {
    expect(isShortDelivery(100, 90)).toBe(true); // 10% short
  });

  it('does not flag delivery at exactly 5% short', () => {
    // 95/100 = 5% shortfall exactly → not > 5%, so not short
    expect(isShortDelivery(100, 95)).toBe(false);
  });

  it('does not flag delivery under 5% short', () => {
    expect(isShortDelivery(100, 96)).toBe(false); // 4% short
  });

  it('does not flag full delivery', () => {
    expect(isShortDelivery(100, 100)).toBe(false);
  });

  it('does not flag over-delivery', () => {
    expect(isShortDelivery(100, 105)).toBe(false);
  });

  it('returns false for zero ordered quantity', () => {
    expect(isShortDelivery(0, 0)).toBe(false);
  });

  it('handles fractional quantities', () => {
    expect(isShortDelivery(10.0, 9.4)).toBe(true);
    expect(isShortDelivery(10.0, 9.6)).toBe(false);
  });
});

describe('calcShortfallFraction', () => {
  it('returns correct fraction', () => {
    expect(calcShortfallFraction(100, 80)).toBeCloseTo(0.2);
  });

  it('returns 0 when no shortfall', () => {
    expect(calcShortfallFraction(100, 100)).toBe(0);
  });

  it('returns 0 for over-delivery', () => {
    expect(calcShortfallFraction(100, 110)).toBe(0);
  });

  it('returns 0 for zero ordered quantity', () => {
    expect(calcShortfallFraction(0, 0)).toBe(0);
  });
});
