// src/__tests__/ResourceEngine.test.ts
import { calcResourceRates, clampResources } from '../systems/economy/ResourceEngine'
import { getSpiritFieldRate } from '../data/buildings'

describe('ResourceEngine', () => {
  it('should produce 0 spiritEnergy/s with no buildings', () => {
    const rates = calcResourceRates({ spiritField: 0, spiritMine: 0, mainHall: 1 })
    expect(rates.spiritEnergy).toBe(0)
    expect(rates.herb).toBe(0)
  })

  it('should produce herb and spiritEnergy with spiritField', () => {
    const rates = calcResourceRates({ spiritField: 1, spiritMine: 0, mainHall: 1 })
    expect(rates.spiritEnergy).toBe(3)
    expect(rates.herb).toBe(0.1)
  })

  it('should scale production with building level', () => {
    const rates = calcResourceRates({ spiritField: 3, spiritMine: 0, mainHall: 1 })
    expect(rates.spiritEnergy).toBe(7)
    expect(rates.herb).toBeCloseTo(0.3)
  })

  it('should apply technique and disciple bonuses', () => {
    const rates = calcResourceRates(
      { spiritField: 2, spiritMine: 0, mainHall: 1 },
      { techniqueMultiplier: 1.2, discipleMultiplier: 1.1 }
    )
    expect(rates.spiritEnergy).toBeCloseTo(5 * 1.2 * 1.1)
    expect(rates.herb).toBeCloseTo(0.1 * 2 * 1.2 * 1.1)
  })

  it('should produce spirit stone and ore from spirit mine', () => {
    const rates = calcResourceRates({ spiritField: 0, spiritMine: 1, mainHall: 1 })
    expect(rates.spiritStone).toBe(0.5)
    expect(rates.ore).toBe(0.05)
  })

  it('should produce all resources from both buildings', () => {
    const rates = calcResourceRates({ spiritField: 2, spiritMine: 3, mainHall: 1 })
    expect(rates.spiritEnergy).toBe(5)
    expect(rates.spiritStone).toBeCloseTo(1.5)
    expect(rates.herb).toBeCloseTo(0.2)
    expect(rates.ore).toBeCloseTo(0.15)
  })
})

test('calcResourceRates spirit energy matches getSpiritFieldRate for level >= 1', () => {
  for (let level = 1; level <= 10; level++) {
    const rates = calcResourceRates({ spiritField: level, spiritMine: 0, mainHall: 1 })
    expect(rates.spiritEnergy).toBe(getSpiritFieldRate(level))
  }
})

describe('clampResources', () => {
  it('does not clamp when below caps', () => {
    const resources = { spiritStone: 100, spiritEnergy: 200, herb: 50, ore: 30 }
    const caps = { spiritEnergy: 500, herb: 200, ore: 200 }
    const result = clampResources(resources, caps)
    expect(result.spiritEnergy).toBe(200)
    expect(result.herb).toBe(50)
    expect(result.ore).toBe(30)
    expect(result.spiritStone).toBe(100)
  })

  it('clamps resources to caps', () => {
    const resources = { spiritStone: 9999, spiritEnergy: 800, herb: 300, ore: 250 }
    const caps = { spiritEnergy: 500, herb: 200, ore: 200 }
    const result = clampResources(resources, caps)
    expect(result.spiritEnergy).toBe(500)
    expect(result.herb).toBe(200)
    expect(result.ore).toBe(200)
    expect(result.spiritStone).toBe(9999)
  })

  it('returns new object without mutating original', () => {
    const resources = { spiritStone: 100, spiritEnergy: 600, herb: 300, ore: 300 }
    const caps = { spiritEnergy: 500, herb: 200, ore: 200 }
    const result = clampResources(resources, caps)
    expect(resources.spiritEnergy).toBe(600) // original unchanged
    expect(result.spiritEnergy).toBe(500) // clamped copy
  })
})
