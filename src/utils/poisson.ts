/**
 * Sample a count from a Poisson distribution with the given expected value.
 *
 * Knuth's algorithm: adequate for the small lambdas used by idle-game event
 * scheduling (lambda < ~30). Uses an injectable RNG so simulations and tests
 * can control randomness.
 */
export function samplePoisson(lambda: number, rng: () => number = Math.random): number {
  if (lambda <= 0) return 0
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= rng()
  } while (p > L)
  return k - 1
}
