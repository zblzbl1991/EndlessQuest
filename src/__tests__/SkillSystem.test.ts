import { calcTechniqueBonuses, applyTechniqueBonuses } from '../systems/skill/SkillSystem'
import type { Technique } from '../types/technique'
import type { BaseStats, CultivationStats } from '../types/character'

const mockTechnique: Technique = {
  id: 'basic_meditation',
  name: '基础吐纳术',
  description: '基础功法',
  tier: 'mortal',
  element: 'neutral',
  growthModifiers: {
    hp: 20,
    atk: 5,
    def: 3,
    spd: 2,
    crit: 0,
    critDmg: 0,
  },
  fixedBonuses: [
    { type: 'hp', value: 50 },
    { type: 'def', value: 5 },
    { type: 'spiritPower', value: 10 },
  ],
  requirements: { minRealm: 0, minComprehension: 0 },
  comprehensionDifficulty: 1,
}

describe('SkillSystem', () => {
  it('should calculate technique bonuses from growth modifiers', () => {
    const bonuses = calcTechniqueBonuses(mockTechnique, 50)
    // At 50% comprehension, growth modifiers are scaled by 0.5
    // Fixed bonuses: index 0 (threshold 30) applies: hp+50
    // Index 1 (threshold 70) does NOT apply at comprehension 50
    // Index 2 (threshold 100) does NOT apply
    expect(bonuses.hp).toBe(10 + 50) // 20 * 0.5 + fixed bonus at threshold 30
    expect(bonuses.atk).toBe(2.5) // 5 * 0.5
    expect(bonuses.def).toBe(1.5) // 3 * 0.5 (fixed bonus at threshold 70 not reached)
    expect(bonuses.spiritPower).toBeUndefined() // fixed bonus at threshold 100 not reached
  })

  it('should return empty bonuses for null technique', () => {
    const bonuses = calcTechniqueBonuses(null, 50)
    expect(Object.keys(bonuses)).toHaveLength(0)
  })

  it('should apply bonuses to base and cultivation stats', () => {
    const base: BaseStats = { hp: 100, atk: 15, def: 8, spd: 10, crit: 0.05, critDmg: 1.5 }
    const cult: CultivationStats = { spiritPower: 50, maxSpiritPower: 50, comprehension: 10, spiritualRoot: 10, fortune: 5 }
    const bonuses = calcTechniqueBonuses(mockTechnique, 100)
    const result = applyTechniqueBonuses(base, cult, bonuses)
    // At 100% comprehension: hp = 20 + 50 = 70, def = 3 + 5 = 8
    expect(result.baseStats.hp).toBe(170) // 100 + 70
    expect(result.baseStats.def).toBe(16) // 8 + 8
    expect(result.cultivationStats.spiritPower).toBe(60) // 50 + 10
  })
})
