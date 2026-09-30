/**
 * Seeded pseudo-random number generator (mulberry32).
 * Keeps benchmark runs reproducible across architectures and page loads.
 */

const UINT32_RANGE = 4294967296 as const;
const MULBERRY_INCREMENT = 0x6d2b79f5 as const;

export function buildSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return (): number => {
    state = (state + MULBERRY_INCREMENT) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / UINT32_RANGE;
  };
}
