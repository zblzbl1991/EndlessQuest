import { calcTechniqueBonuses, applyTechniqueBonuses } from '../systems/skill/SkillSystem'
import type { BaseStats, CultivationStats } from '../types/character'

describe('SkillSystem', () => {
  it('should calculate technique bonuses from learned technique IDs', () => {
    // qingxin: hp+10, atk+2, def+2, spd+1
    const bonuses = calcTechniqueBonuses(['qingxin'])
    expect(bonuses.hp).toBe(10)
    expect(bonuses.atk).toBe(2)
    expect(bonuses.def).toBe(2)
    expect(bonuses.spd).toBe(1)
  })

  it('should return empty bonuses for empty techniques array', () => {
    const bonuses = calcTechniqueBonuses([])
    expect(Object.keys(bonuses)).toHaveLength(0)
  })

  it('should sum bonuses from multiple techniques', () => {
    // qingxin: hp+10, atk+2, def+2, spd+1
    // lieyan: atk+5, crit+0.02
    const bonuses = calcTechniqueBonuses(['qingxin', 'lieyan'])
    expect(bonuses.hp).toBe(10)
    expect(bonuses.atk).toBe(7)   // 2 + 5
    expect(bonuses.def).toBe(2)
    expect(bonuses.spd).toBe(1)
    expect(bonuses.crit).toBe(0.02)
  })

  it('should apply bonuses to base and cultivation stats', () => {
    const base: BaseStats = { hp: 100, atk: 15, def: 8, spd: 10, crit: 0.05, critDmg: 1.5 }
    const cult: CultivationStats = { spiritPower: 50, maxSpiritPower: 50, comprehension: 10, spiritualRoot: 10, fortune: 5 }
    const bonuses = calcTechniqueBonuses(['qingxin', 'lieyan'])
    const result = applyTechniqueBonuses(base, cult, bonuses)
    expect(result.baseStats.hp).toBe(110)  // 100 + 10
    expect(result.baseStats.atk).toBe(22)   // 15 + 7
    expect(result.baseStats.def).toBe(10)   // 8 + 2
    expect(result.baseStats.crit).toBeCloseTo(0.07, 5) // 0.05 + 0.02
  })
})
