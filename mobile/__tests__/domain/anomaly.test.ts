import { detectAnomaly } from '../../src/domain/anomaly';

describe('detectAnomaly', () => {
  // Not enough data
  it('returns false with fewer than 3 total values', () => {
    expect(detectAnomaly(1000, [])).toBe(false);
    expect(detectAnomaly(1000, [1000])).toBe(false);
  });

  it('returns false when value is in normal range', () => {
    expect(detectAnomaly(1000, [800, 900, 1100, 1200])).toBe(false);
  });

  // High anomaly
  it('flags high when value > 5× median', () => {
    // peers: [1000, 1000, 1000], value: 6000, median of all = 1000
    expect(detectAnomaly(6000, [1000, 1000, 1000])).toBe('high');
  });

  it('does not flag at exactly 5× median', () => {
    expect(detectAnomaly(5000, [1000, 1000, 1000])).toBe(false);
  });

  it('flags high just above 5×', () => {
    expect(detectAnomaly(5001, [1000, 1000, 1000])).toBe('high');
  });

  // Low anomaly
  it('flags low when value < 0.2× median', () => {
    // peers: [1000, 1000, 1000], value: 100, median = 1000
    expect(detectAnomaly(100, [1000, 1000, 1000])).toBe('low');
  });

  it('does not flag at exactly 0.2× median', () => {
    expect(detectAnomaly(200, [1000, 1000, 1000])).toBe(false);
  });

  it('flags low just below 0.2×', () => {
    expect(detectAnomaly(199, [1000, 1000, 1000])).toBe('low');
  });

  // Median with even number of items
  it('computes median correctly for even-length array', () => {
    // all values: [100, 1000, 1200, 6500] → sorted; median = (1000+1200)/2 = 1100
    // 6500 > 1100 * 5 = 5500 → high
    expect(detectAnomaly(6500, [100, 1000, 1200])).toBe('high');
  });

  // Zero handling
  it('returns false when median is 0', () => {
    expect(detectAnomaly(0, [0, 0, 0])).toBe(false);
  });

  it('ignores zero values in peer set', () => {
    // non-zero values: [1000, 1000, value=6000] → median 1000 → 6000 > 5000 → high
    expect(detectAnomaly(6000, [0, 1000, 1000])).toBe('high');
  });

  // Boundary: exactly 3 items (minimum)
  it('works with exactly 3 items total', () => {
    expect(detectAnomaly(6000, [1000, 1000])).toBe('high');
    expect(detectAnomaly(50, [1000, 1000])).toBe('low');
    expect(detectAnomaly(1000, [1000, 1000])).toBe(false);
  });
});
