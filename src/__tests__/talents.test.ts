import { ALL_TALENTS, getTalentsByRarity, getTalentById } from '../data/talents'
import type { Talent } from '../types/talent'
import { TALENT_RARITY_NAMES } from '../types/talent'

describe('talent types', () => {
  it('should construct a valid talent with single effect', () => {
    const t: Talent = {
      id: 'wugu',
      name: '武骨',
      description: '攻击+3',
      effect: [{ stat: 'atk', value: 3 }],
      rarity: 'common',
    }
    expect(t.effect).toHaveLength(1)
    expect(t.effect[0].stat).toBe('atk')
  })

  it('should construct a valid talent with dual effects', () => {
    const t: Talent = {
      id: 'taiji',
      name: '太极',
      description: '灵根+8, 悟性+3',
      effect: [
        { stat: 'spiritualRoot', value: 8 },
        { stat: 'comprehension', value: 3 },
      ],
      rarity: 'epic',
    }
    expect(t.effect).toHaveLength(2)
  })
})

describe('TALENT_RARITY_NAMES', () => {
  it('should have names for all rarities', () => {
    expect(TALENT_RARITY_NAMES.common).toBe('凡')
    expect(TALENT_RARITY_NAMES.rare).toBe('良')
    expect(TALENT_RARITY_NAMES.epic).toBe('绝')
  })
})

describe('talent data table', () => {
  it('should have 30 talents', () => {
    expect(ALL_TALENTS).toHaveLength(30)
  })

  it('should have all talents with unique ids', () => {
    const ids = new Set(ALL_TALENTS.map((t) => t.id))
    expect(ids.size).toBe(30)
  })

  it('should have correct rarity distribution', () => {
    const byRarity = getTalentsByRarity()
    expect(byRarity.common).toHaveLength(15)
    expect(byRarity.rare).toHaveLength(10)
    expect(byRarity.epic).toHaveLength(5)
  })

  it('getTalentById should return correct talent', () => {
    const t = getTalentById('tianmai')
    expect(t).toBeDefined()
    expect(t!.name).toBe('天脉')
    expect(t!.rarity).toBe('rare')
  })

  it('getTalentById should return undefined for unknown id', () => {
    expect(getTalentById('nonexistent')).toBeUndefined()
  })

  it('all effects should reference valid stats', () => {
    const validStats = new Set([
      'spiritualRoot',
      'comprehension',
      'fortune',
      'hp',
      'atk',
      'def',
      'spd',
      'crit',
      'critDmg',
      'maxSpiritPower',
    ])
    for (const talent of ALL_TALENTS) {
      for (const eff of talent.effect) {
        expect(validStats.has(eff.stat)).toBe(true)
      }
    }
  })
})
