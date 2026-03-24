// src/__tests__/ResourceEngine.test.ts
import { calcResourceRates } from '../systems/economy/ResourceEngine'

describe('ResourceEngine', () => {
  it('should produce minimum 1 spiritEnergy/s with no buildings', () => {
    const rates = calcResourceRates({ spiritField: 0, mainHall: 1 })
    expect(rates.spiritEnergy).toBe(1)
    expect(rates.herb).toBe(0)
  })

  it('should produce herb and increased spiritEnergy with spiritField', () => {
    const rates = calcResourceRates({ spiritField: 1, mainHall: 1 })
    expect(rates.spiritEnergy).toBe(1)
    expect(rates.herb).toBe(0.1)
  })

  it('should scale production with building level', () => {
    const rates = calcResourceRates({ spiritField: 3, mainHall: 1 })
    expect(rates.spiritEnergy).toBe(3)
    expect(rates.herb).toBeCloseTo(0.3)
  })

  it('should apply technique and disciple bonuses', () => {
    const rates = calcResourceRates(
      { spiritField: 2, mainHall: 1 },
      { techniqueMultiplier: 1.2, discipleMultiplier: 1.1 }
    )
    expect(rates.spiritEnergy).toBeCloseTo(2 * 1.2 * 1.1)
    expect(rates.herb).toBeCloseTo(0.1 * 2 * 1.2 * 1.1)
  })

  it('should guarantee minimum 1 spiritEnergy/s even with level 0 buildings', () => {
    const rates = calcResourceRates({ spiritField: 0, mainHall: 0 })
    expect(rates.spiritEnergy).toBe(1)
  })

  it('should return 0 for ore and spiritStone in Phase 2', () => {
    const rates = calcResourceRates({ spiritField: 5, mainHall: 1 })
    expect(rates.ore).toBe(0)
    expect(rates.spiritStone).toBe(0)
  })
})
