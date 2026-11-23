import { costPerPortion, dishMargin, lineCost, roundMoney } from '@/domain/calculations/recipe-cost';

// Mockup p.9 (Boilo, RWF): qty × FB price per unit.
const BOILO = [
  { qty: 0.25, pricePerUnit: 4500 }, // Chicken      1,125
  { qty: 0.3, pricePerUnit: 400 }, //   Cooking banana 120
  { qty: 0.2, pricePerUnit: 600 }, //   Potatoes       120
  { qty: 0.05, pricePerUnit: 800 }, //  Carrots         40
  { qty: 0.03, pricePerUnit: 1200 }, // Onions          36
  { qty: 0.02, pricePerUnit: 3000 }, // Cooking oil     60
];

describe('recipe cost (screen 09)', () => {
  it('line costs match the mockup', () => {
    expect(BOILO.map((l) => lineCost(l))).toEqual([1125, 120, 120, 40, 36, 60]);
  });

  it('Boilo costs 1,501 per portion', () => {
    expect(costPerPortion(BOILO)).toEqual({ total: 1501, complete: true });
  });

  it('margin at 7,000 is 5,499 (78.6 %)', () => {
    const m = dishMargin(7000, 1501);
    expect(m.amount).toBe(5499);
    expect(m.fraction).toBeCloseTo(0.7856, 4);
    expect(Math.round((m.fraction ?? 0) * 1000) / 10).toBe(78.6);
  });

  it('a line without a price makes the total partial', () => {
    expect(costPerPortion([...BOILO, { qty: 0.1, pricePerUnit: null }])).toEqual({ total: 1501, complete: false });
  });

  it('an empty recipe costs 0', () => {
    expect(costPerPortion([])).toEqual({ total: 0, complete: true });
  });

  it('rejects negative or invalid quantities', () => {
    expect(lineCost({ qty: -1, pricePerUnit: 100 })).toBeNull();
    expect(lineCost({ qty: Number.NaN, pricePerUnit: 100 })).toBeNull();
  });

  it('keeps cents for currencies with decimals', () => {
    expect(lineCost({ qty: 0.333, pricePerUnit: 7.99 }, 2)).toBe(2.66);
    expect(roundMoney(0.125, 2)).toBe(0.13);
  });

  it('margin % is unknown for a price of 0', () => {
    expect(dishMargin(0, 100).fraction).toBeNull();
  });
});
