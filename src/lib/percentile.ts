/** Returns what percentage of `peers` a given `value` exceeds — a 1-100 percentile rank. */
export function computePercentile(value: number, peers: number[]): number {
  const below = peers.filter((peer) => peer <= value).length;
  return Math.round((below / peers.length) * 100);
}
