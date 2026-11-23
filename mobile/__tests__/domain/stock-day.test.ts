import { countDifference, stockLeft, stockLevel } from '@/domain/calculations/stock-day';

// Mockup p.10 (Today's stock).
describe("today's stock (screen 10)", () => {
  it('Chicken 1.0 + 5.0 − 4.1 = 1.9', () => {
    expect(stockLeft(1.0, 5.0, 4.1)).toBe(1.9);
  });

  it.each([
    ['Cooking banana', 2.0, 10.0, 3.6, 8.4],
    ['Potatoes', 1.0, 7.0, 2.4, 5.6],
    ['Rice', 2.0, 5.0, 2.1, 4.9],
    ['Onions', 0.2, 2.0, 0.5, 1.7],
    ['Carrots', 0.3, 0, 0.2, 0.1],
    ['Cooking oil', 0.5, 0, 0.3, 0.2],
  ])('%s: %d + %d − %d = %d', (_name, start, received, used, left) => {
    expect(stockLeft(start, received, used)).toBe(left);
  });

  it('a count replaces Left and saves the difference', () => {
    expect(countDifference(1.9, 1.7)).toBe(-0.2);
    expect(stockLeft(1.0, 5.0, 4.1, -0.2)).toBe(1.7);
  });

  it('amber below one service, red below half of it', () => {
    expect(stockLevel(1.9, 3.5)).toBe('low');
    expect(stockLevel(0.2, 0.5)).toBe('very_low');
    expect(stockLevel(8.4, 3.6)).toBe('ok');
    expect(stockLevel(0, null)).toBe('ok');
  });
});
