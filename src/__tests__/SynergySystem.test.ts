import { describe, it, expect } from 'vitest'
import { getActiveSynergies, getSynergyBonus, getMarketQualityCapBonus } from '../systems/economy/SynergySystem'
import type { Building } from '../types/sect'

function makeBuilding(type: string, level: number): Building {
  return { type: type as any, level, unlocked: true, productionQueue: { recipeId: null, progress: 0 } }
}

describe('getActiveSynergies', () => {
  it('returns empty when no conditions met', () => {
    const buildings = [
      makeBuilding('mainHall', 1),
      makeBuilding('spiritField', 2),
      makeBuilding('alchemyFurnace', 2),
    ]
    expect(getActiveSynergies(buildings)).toHaveLength(0)
  })

  it('activates 灵药之道 when conditions met', () => {
    const buildings = [
      makeBuilding('mainHall', 3),
      makeBuilding('spiritField', 3),
      makeBuilding('alchemyFurnace', 3),
    ]
    const active = getActiveSynergies(buildings)
    expect(active.some(s => s.id === 'alchemy_herbalism')).toBe(true)
  })

  it('activates 百炼成钢 when conditions met', () => {
    const buildings = [
      makeBuilding('mainHall', 3),
      makeBuilding('spiritMine', 3),
      makeBuilding('forge', 3),
    ]
    const active = getActiveSynergies(buildings)
    expect(active.some(s => s.id === 'forging_mining')).toBe(true)
  })

  it('activates multiple synergies', () => {
    const buildings = [
      makeBuilding('mainHall', 5),
      makeBuilding('spiritField', 5),
      makeBuilding('spiritMine', 5),
      makeBuilding('alchemyFurnace', 5),
      makeBuilding('forge', 5),
      makeBuilding('scriptureHall', 3),
      makeBuilding('recruitmentPavilion', 2),
      makeBuilding('market', 3),
    ]
    const active = getActiveSynergies(buildings)
    expect(active.length).toBeGreaterThanOrEqual(5)
  })
})

describe('getSynergyBonus', () => {
  it('returns multiplier for matching building', () => {
    const buildings = [
      makeBuilding('mainHall', 3),
      makeBuilding('spiritField', 3),
      makeBuilding('alchemyFurnace', 3),
    ]
    const bonus = getSynergyBonus('alchemyFurnace', buildings)
    expect(bonus).toBeCloseTo(1.20) // +20% from 灵药之道
  })

  it('returns 1.0 when no synergy for building', () => {
    const buildings = [
      makeBuilding('mainHall', 1),
      makeBuilding('spiritMine', 1),
    ]
    expect(getSynergyBonus('alchemyFurnace', buildings)).toBeCloseTo(1.0)
  })

  it('stacks multiple synergies for same building', () => {
    const buildings = [
      makeBuilding('mainHall', 5),
      makeBuilding('spiritField', 5),
      makeBuilding('alchemyFurnace', 5),
      makeBuilding('forge', 5),
    ]
    // 灵药之道 gives +20% to alchemyFurnace, 丹器双修 gives +25%
    const bonus = getSynergyBonus('alchemyFurnace', buildings)
    expect(bonus).toBeCloseTo(1.45) // +20% + +25%
  })

  it('丹器双修 also gives bonus to forge', () => {
    const buildings = [
      makeBuilding('mainHall', 5),
      makeBuilding('alchemyFurnace', 5),
      makeBuilding('forge', 5),
    ]
    const bonus = getSynergyBonus('forge', buildings)
    expect(bonus).toBeCloseTo(1.25) // +25% from 丹器双修
  })

  it('market synergy returns 1.0 multiplier (quality cap handled separately)', () => {
    const buildings = [
      makeBuilding('mainHall', 5),
      makeBuilding('spiritMine', 5),
      makeBuilding('market', 3),
    ]
    const bonus = getSynergyBonus('market', buildings)
    expect(bonus).toBeCloseTo(1.0) // 开源节流 is not a multiplier
  })

  it('getMarketQualityCapBonus returns 1 when conditions met', () => {
    const buildings = [
      makeBuilding('mainHall', 5),
      makeBuilding('spiritMine', 5),
      makeBuilding('market', 3),
    ]
    expect(getMarketQualityCapBonus(buildings)).toBe(1)
  })
})
