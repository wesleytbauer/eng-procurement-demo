// Deterministic PRNG (mulberry32) — same algorithm the parent OS uses in
// verification/lib/harness.ts. Copied, not imported: this layer stays standalone.
// Every random draw in the demo goes through one of these so artifacts are
// byte-stable across runs (no Date.now / Math.random anywhere).

export type RNG = () => number;

export function mulberry32(seed: number): RNG {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic boolean stream at a target rate, e.g. an on-time history. */
export function bools(rng: RNG, n: number, rate: number): boolean[] {
  return Array.from({ length: n }, () => rng() < rate);
}
