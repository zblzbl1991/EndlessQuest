// src/__tests__/ResourceEngine.test.ts
import { calcResourceRates, getSpiritFieldRate } from '../systems/economy/ResourceEngine'

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

describe('getSpiritFieldRate', () => {
  it('should return 0 for level < 1', () => {
    expect(getSpiritFieldRate(0)).toBe(0)
    expect(getSpiritFieldRate(-1)).toBe(0)
  })

  it('should return correct rate for level 1', () => {
    expect(getSpiritFieldRate(1)).toBe(1)
  })

  it('should return correct rate for level 2', () => {
    expect(getSpiritFieldRate(2)).toBe(4)
  })

  it('should return correct rate for level 3', () => {
    expect(getSpiritFieldRate(3)).toBe(7)
  })

  it('should return correct rate for level 5', () => {
    expect(getSpiritFieldRate(5)).toBe(13)
  })

  it('should return correct rate for level 10', () => {
    expect(getSpiritFieldRate(10)).toBe(28)
  })
})
