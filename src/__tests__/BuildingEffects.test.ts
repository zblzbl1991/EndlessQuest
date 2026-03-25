import { describe, it, expect } from 'vitest'
import {
  getBuildingLevel,
  getMarketBuff,
  getAlchemyBuff,
  getForgeBuff,
  getScriptureBuff,
  getRecruitBuff,
  getTrainingBuff,
  getTrainingSpeedMult,
  getEnhanceSuccessBonus,
  getEnhanceCostReduction,
  getRecruitCostMult,
  getComprehensionSpeedMult,
  getPotionEffectMult,
  getForgeUnlockLevel,
  getAlchemyUnlockLevel,
  getStudyUnlockLevel,
  getTargetedRecruitUnlockLevel,
  getGroupTransmissionUnlockLevel,
  getMarketUnlockLevel,
} from '../systems/economy/BuildingEffects'
import type { BuildingType } from '../types/sect'

const buildings = (overrides: Record<string, number>) =>
  Object.entries(overrides).map(([type, level]) => ({ type: type as BuildingType, level, unlocked: level > 0 }))

describe('getBuildingLevel', () => {
  it('returns 0 for missing building', () => {
    expect(getBuildingLevel([], 'market')).toBe(0)
  })
  it('returns correct level', () => {
    const b = buildings({ market: 3, forge: 5 })
    expect(getBuildingLevel(b, 'market')).toBe(3)
    expect(getBuildingLevel(b, 'forge')).toBe(5)
  })
})

describe('market buffs', () => {
  it('refresh count = 1 + marketLevel', () => {
    expect(getMarketBuff(0).dailyRefreshCount).toBe(1)
    expect(getMarketBuff(3).dailyRefreshCount).toBe(4)
  })
  it('quality cap = marketLevel', () => {
    expect(getMarketBuff(0).qualityCapIndex).toBe(0)
    expect(getMarketBuff(5).qualityCapIndex).toBe(5)
  })
  it('unlock at level 3', () => {
    expect(getMarketUnlockLevel()).toBe(3)
  })
})

describe('alchemy buffs', () => {
  it('potion effect = 1 + 0.2 * level', () => {
    expect(getAlchemyBuff(0).potionEffectMult).toBe(1)
    expect(getAlchemyBuff(1).potionEffectMult).toBe(1.2)
    expect(getAlchemyBuff(5).potionEffectMult).toBe(2.0)
  })
  it('unlock at level 3', () => {
    expect(getAlchemyUnlockLevel()).toBe(3)
  })
})

describe('forge buffs', () => {
  it('success bonus = 0.1 * level', () => {
    expect(getForgeBuff(0).successBonus).toBe(0)
    expect(getForgeBuff(3).successBonus).toBeCloseTo(0.3)
  })
  it('cost reduction = 0.1 * level capped at 0.7', () => {
    expect(getForgeBuff(3).costReduction).toBeCloseTo(0.3)
    expect(getForgeBuff(8).costReduction).toBe(0.7)
  })
  it('unlock at level 3', () => {
    expect(getForgeUnlockLevel()).toBe(3)
  })
})

describe('scripture buffs', () => {
  it('comprehension speed = 1 + 0.15 * level', () => {
    expect(getScriptureBuff(0).comprehensionMult).toBe(1)
    expect(getScriptureBuff(2).comprehensionMult).toBe(1.3)
    expect(getScriptureBuff(8).comprehensionMult).toBe(2.2)
  })
  it('unlock at level 3', () => {
    expect(getStudyUnlockLevel()).toBe(3)
  })
})

describe('recruitment buffs', () => {
  it('cost mult = max(0.4, 1 - 0.1 * level)', () => {
    expect(getRecruitBuff(0).costMult).toBe(1)
    expect(getRecruitBuff(3).costMult).toBe(0.7)
    expect(getRecruitBuff(6).costMult).toBe(0.4)
  })
  it('unlock at level 3', () => {
    expect(getTargetedRecruitUnlockLevel()).toBe(3)
  })
})

describe('training buffs', () => {
  it('speed mult = 1 + 0.1 * level', () => {
    expect(getTrainingBuff(0).speedMult).toBe(1)
    expect(getTrainingBuff(3).speedMult).toBe(1.3)
  })
  it('unlock at level 3', () => {
    expect(getGroupTransmissionUnlockLevel()).toBe(3)
  })
})

describe('convenience multipliers', () => {
  it('getTrainingSpeedMult', () => {
    expect(getTrainingSpeedMult(buildings({}))).toBe(1)
    expect(getTrainingSpeedMult(buildings({ trainingHall: 5 }))).toBe(1.5)
  })
  it('getEnhanceSuccessBonus', () => {
    expect(getEnhanceSuccessBonus(buildings({}))).toBe(0)
    expect(getEnhanceSuccessBonus(buildings({ forge: 3 }))).toBeCloseTo(0.3)
  })
  it('getEnhanceCostReduction', () => {
    expect(getEnhanceCostReduction(buildings({}))).toBe(0)
    expect(getEnhanceCostReduction(buildings({ forge: 5 }))).toBe(0.5)
  })
  it('getRecruitCostMult', () => {
    expect(getRecruitCostMult(buildings({}))).toBe(1)
    expect(getRecruitCostMult(buildings({ recruitmentPavilion: 3 }))).toBe(0.7)
  })
  it('getComprehensionSpeedMult returns comprehensionMult', () => {
    expect(getComprehensionSpeedMult(buildings({}))).toBe(1)
    expect(getComprehensionSpeedMult(buildings({ scriptureHall: 4 }))).toBe(1.6)
  })
  it('getPotionEffectMult', () => {
    expect(getPotionEffectMult(buildings({}))).toBe(1)
    expect(getPotionEffectMult(buildings({ alchemyFurnace: 3 }))).toBe(1.6)
  })
})
