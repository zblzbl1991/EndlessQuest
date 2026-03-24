import { calcTechniqueBonuses, applyTechniqueBonuses } from '../systems/skill/SkillSystem'
import type { Technique } from '../types/skill'
import type { BaseStats, CultivationStats } from '../types/player'

const mockTechniques: Record<string, Technique> = {
  basic_meditation: { id: 'basic_meditation', name: '基础吐纳术', type: 'mental', tier: 1, statBonus: { spiritPower: 10, comprehension: 2 }, description: '' },
  iron_body: { id: 'iron_body', name: '铁布衫', type: 'body', tier: 1, statBonus: { hp: 30, def: 3 }, description: '' },
}

describe('SkillSystem', () => {
  it('should calculate technique bonuses', () => {
    const bonuses = calcTechniqueBonuses(['basic_meditation', 'iron_body'], (id) => mockTechniques[id])
    expect(bonuses.spiritPower).toBe(10)
    expect(bonuses.comprehension).toBe(2)
    expect(bonuses.hp).toBe(30)
    expect(bonuses.def).toBe(3)
  })

  it('should handle null technique slots', () => {
    const bonuses = calcTechniqueBonuses([null, 'basic_meditation', null], (id) => mockTechniques[id])
    expect(bonuses.spiritPower).toBe(10)
  })

  it('should apply bonuses to base and cultivation stats', () => {
    const base: BaseStats = { hp: 100, atk: 15, def: 8, spd: 10, crit: 0.05, critDmg: 1.5 }
    const cult: CultivationStats = { spiritPower: 50, maxSpiritPower: 50, comprehension: 10, spiritualRoot: 10, fortune: 5 }
    const bonuses = calcTechniqueBonuses(['iron_body'], (id) => mockTechniques[id])
    const result = applyTechniqueBonuses(base, cult, bonuses)
    expect(result.baseStats.hp).toBe(130)
    expect(result.baseStats.def).toBe(11)
  })
})
