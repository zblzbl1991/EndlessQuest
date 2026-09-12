import { describe, it, expect } from 'vitest'
import { samplePoisson } from '../utils/poisson'

describe('samplePoisson', () => {
  it('returns 0 for non-positive lambda', () => {
    expect(samplePoisson(0)).toBe(0)
    expect(samplePoisson(-5)).toBe(0)
  })

  it('mean converges to lambda', () => {
    const lambda = 3
    const samples = 20000
    let sum = 0
    for (let i = 0; i < samples; i++) {
      sum += samplePoisson(lambda)
    }
    const mean = sum / samples
    // SE = sqrt(3)/sqrt(20000) ~ 0.012; tolerance is ~8 sigma
    expect(Math.abs(mean - lambda)).toBeLessThan(0.1)
  })

  it('respects the zero-inflation of small lambdas', () => {
    // P(0) = e^-3 ~ 0.0498 for lambda = 3
    const samples = 20000
    let zeros = 0
    for (let i = 0; i < samples; i++) {
      if (samplePoisson(3) === 0) zeros++
    }
    const p0 = zeros / samples
    expect(Math.abs(p0 - Math.exp(-3))).toBeLessThan(0.02)
  })

  it('is deterministic with an injected RNG', () => {
    let counter = 0
    const seq = [0.1, 0.9, 0.5, 0.2, 0.8]
    const rng = () => seq[counter++ % seq.length]
    const a = samplePoisson(1, rng)
    counter = 0
    const b = samplePoisson(1, rng)
    expect(a).toBe(b)
  })
})
