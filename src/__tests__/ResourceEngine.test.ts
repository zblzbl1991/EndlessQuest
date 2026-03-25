// src/__tests__/ResourceEngine.test.ts
import { calcResourceRates } from '../systems/economy/ResourceEngine'
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
