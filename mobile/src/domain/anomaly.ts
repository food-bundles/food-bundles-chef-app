/**
 * Shared anomaly detection helper.
 * Requires ≥3 data points; flags values > 5× or < 0.2× the median.
 * Returns 'high' | 'low' | false. Never blocking — caller shows a soft warning.
 */
export function detectAnomaly(value: number, peers: number[]): 'high' | 'low' | false {
  if (peers.length < 2) return false; // need at least 2 peers + current = 3 total
  const all = [...peers, value].filter((v) => v > 0);
  if (all.length < 3) return false;
  const sorted = [...all].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 1
      ? (sorted[mid] ?? 0)
      : (((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2);
  if (median === 0) return false;
  if (value > median * 5) return 'high';
  if (value < median * 0.2) return 'low';
  return false;
}
