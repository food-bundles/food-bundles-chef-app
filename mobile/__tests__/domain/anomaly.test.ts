import { detectAnomaly } from '../../src/domain/anomaly';

const rwf = (amount: number) => ({ amount, currency: 'RWF' });
const usd = (amount: number) => ({ amount, currency: 'USD' });
const peersRwf = (...amounts: number[]) => amounts.map(rwf);

describe('detectAnomaly', () => {
  // Not enough data
  it('returns false with fewer than 3 total values', () => {
    expect(detectAnomaly(rwf(1000), [])).toBe(false);
    expect(detectAnomaly(rwf(1000), peersRwf(1000))).toBe(false);
  });

  it('returns false when value is in normal range', () => {
    expect(detectAnomaly(rwf(1000), peersRwf(800, 900, 1100, 1200))).toBe(false);
  });

  // High anomaly
  it('flags high when value > 5× median', () => {
    expect(detectAnomaly(rwf(6000), peersRwf(1000, 1000, 1000))).toBe('high');
  });

  it('does not flag at exactly 5× median', () => {
    expect(detectAnomaly(rwf(5000), peersRwf(1000, 1000, 1000))).toBe(false);
  });

  it('flags high just above 5×', () => {
    expect(detectAnomaly(rwf(5001), peersRwf(1000, 1000, 1000))).toBe('high');
  });

  // Low anomaly
  it('flags low when value < 0.2× median', () => {
    expect(detectAnomaly(rwf(100), peersRwf(1000, 1000, 1000))).toBe('low');
  });

  it('does not flag at exactly 0.2× median', () => {
    expect(detectAnomaly(rwf(200), peersRwf(1000, 1000, 1000))).toBe(false);
  });

  it('flags low just below 0.2×', () => {
    expect(detectAnomaly(rwf(199), peersRwf(1000, 1000, 1000))).toBe('low');
  });

  // Median with even number of items: [100, 1000, 1200, 6500] → (1000 + 1200) / 2 = 1100
  it('computes median correctly for even-length array', () => {
    expect(detectAnomaly(rwf(6500), peersRwf(100, 1000, 1200))).toBe('high');
  });

  // Zero handling
  it('returns false when there are no priced peers', () => {
    expect(detectAnomaly(rwf(0), peersRwf(0, 0, 0))).toBe(false);
  });

  it('ignores zero values in peer set', () => {
    // [0, 1000, 1000] → priced peers 1000, 1000 → 6000 > 5 × 1000
    expect(detectAnomaly(rwf(6000), peersRwf(0, 1000, 1000))).toBe('high');
  });

  // Boundary: exactly 3 items (minimum)
  it('works with exactly 3 items total', () => {
    expect(detectAnomaly(rwf(6000), peersRwf(1000, 1000))).toBe('high');
    expect(detectAnomaly(rwf(50), peersRwf(1000, 1000))).toBe('low');
    expect(detectAnomaly(rwf(1000), peersRwf(1000, 1000))).toBe(false);
  });

  // Currencies (Step 2a, section 2e)
  it('never compares prices in different currencies', () => {
    // $7.99 among RWF prices: no same-currency peers, so no check (not "low").
    expect(detectAnomaly(usd(7.99), peersRwf(3500, 4000, 5000))).toBe(false);
    // RWF 30,000 among USD prices: no check either.
    expect(detectAnomaly(rwf(30000), [usd(8), usd(12), usd(9.5)])).toBe(false);
  });

  it('uses only same-currency peers from a mixed list', () => {
    const mixed = [usd(8), usd(9), rwf(3000), rwf(3500)];
    expect(detectAnomaly(usd(60), mixed)).toBe('high'); // median of 8, 9, 60 = 9
    expect(detectAnomaly(usd(10), mixed)).toBe(false);
  });

  it('treats currency codes case-insensitively and supports decimals', () => {
    expect(detectAnomaly({ amount: 1.2, currency: 'eur' }, [{ amount: 9.5, currency: 'EUR' }, { amount: 8.9, currency: 'EUR' }])).toBe(
      'low',
    );
  });
});
