/**
 * Currently we have 2 sources, so "median" is the mean of the two values (floored).
 * If only 1 valid source exists, we use it.
 */

export function medianConsensus(delays: number[]): number {
  if (delays.length === 0) throw new Error("No delays provided");

  const sorted = [...delays].sort((a, b) => a - b);
  const n = sorted.length;

  if (n === 1) return sorted[0];

  // Even count: mean of middle two, floored for determinism
  const mid1 = sorted[n / 2 - 1];
  const mid2 = sorted[n / 2];
  return Math.floor((mid1 + mid2) / 2);
}
