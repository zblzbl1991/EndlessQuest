import {
  applyBerserk,
  calcShield,
  calcSpiritDrainHeal,
  shouldSwiftExtraTurn,
  calcTribulationBaneDamage,
  hasAffix,
} from '../systems/combat/AffixSystem'
import { AFFIX_DEFS, rollAffixes } from '../data/affixes'
import type { EnemyAffix } from '../types/adventure'

describe('AffixSystem', () => {
  describe('applyBerserk', () => {
    it('should boost atk by 50% when HP < 30%', () => {
      expect(applyBerserk(100, 20, 100)).toBe(150)
    })

    it('should not boost atk when HP >= 30%', () => {
      expect(applyBerserk(100, 30, 100)).toBe(100)
      expect(applyBerserk(100, 50, 100)).toBe(100)
      expect(applyBerserk(100, 100, 100)).toBe(100)
    })

    it('should handle exact 30% boundary (not boosted)', () => {
      expect(applyBerserk(100, 30, 100)).toBe(100)
    })

    it('should floor the boosted value', () => {
      expect(applyBerserk(101, 10, 100)).toBe(151) // 101 * 1.5 = 151.5 -> 151
    })

    it('should handle zero atk', () => {
      expect(applyBerserk(0, 10, 100)).toBe(0)
    })
  })

  describe('calcShield', () => {
    it('should return 20% of maxHp when shield affix is present', () => {
      expect(calcShield(1000, true)).toBe(200)
    })

    it('should return 0 when shield affix is absent', () => {
      expect(calcShield(1000, false)).toBe(0)
    })

    it('should floor the shield value', () => {
      expect(calcShield(555, true)).toBe(111) // 555 * 0.2 = 111
    })
  })

  describe('calcSpiritDrainHeal', () => {
    it('should return 10% of damage when spiritDrain is present', () => {
      expect(calcSpiritDrainHeal(100, true)).toBe(10)
    })

    it('should return 0 when spiritDrain is absent', () => {
      expect(calcSpiritDrainHeal(100, false)).toBe(0)
    })

    it('should floor the heal value', () => {
      expect(calcSpiritDrainHeal(99, true)).toBe(9) // 99 * 0.1 = 9.9 -> 9
    })
  })

  describe('shouldSwiftExtraTurn', () => {
    it('should return true every 3rd turn when swift is present', () => {
      expect(shouldSwiftExtraTurn(3, true)).toBe(true)
      expect(shouldSwiftExtraTurn(6, true)).toBe(true)
      expect(shouldSwiftExtraTurn(9, true)).toBe(true)
    })

    it('should return false on non-multiple-of-3 turns', () => {
      expect(shouldSwiftExtraTurn(1, true)).toBe(false)
      expect(shouldSwiftExtraTurn(2, true)).toBe(false)
      expect(shouldSwiftExtraTurn(4, true)).toBe(false)
      expect(shouldSwiftExtraTurn(5, true)).toBe(false)
    })

    it('should return false when swift is absent', () => {
      expect(shouldSwiftExtraTurn(3, false)).toBe(false)
      expect(shouldSwiftExtraTurn(6, false)).toBe(false)
    })

    it('should return false on turn 0', () => {
      expect(shouldSwiftExtraTurn(0, true)).toBe(false)
    })
  })

  describe('calcTribulationBaneDamage', () => {
    it('should return 5% of atk as bonus damage when tribulationBane is present', () => {
      expect(calcTribulationBaneDamage(200, true)).toBe(10)
    })

    it('should return 0 when tribulationBane is absent', () => {
      expect(calcTribulationBaneDamage(200, false)).toBe(0)
    })

    it('should floor the damage value', () => {
      expect(calcTribulationBaneDamage(99, true)).toBe(4) // 99 * 0.05 = 4.95 -> 4
    })
  })

  describe('hasAffix', () => {
    it('should return true when affix is in the list', () => {
      expect(hasAffix(['berserk', 'shield'], 'berserk')).toBe(true)
      expect(hasAffix(['berserk', 'shield'], 'shield')).toBe(true)
    })

    it('should return false when affix is not in the list', () => {
      expect(hasAffix(['berserk'], 'shield')).toBe(false)
    })

    it('should return false when affixes is undefined', () => {
      expect(hasAffix(undefined, 'berserk')).toBe(false)
    })

    it('should return false for empty list', () => {
      expect(hasAffix([], 'berserk')).toBe(false)
    })
  })
})

describe('affixes data', () => {
  it('should define all 5 affix types', () => {
    const keys = Object.keys(AFFIX_DEFS) as EnemyAffix[]
    expect(keys).toHaveLength(5)
    expect(keys).toContain('berserk')
    expect(keys).toContain('shield')
    expect(keys).toContain('spiritDrain')
    expect(keys).toContain('swift')
    expect(keys).toContain('tribulationBane')
  })

  it('each affix should have name, description, and triggerChance > 0', () => {
    for (const affix of Object.values(AFFIX_DEFS)) {
      expect(affix.name.length).toBeGreaterThan(0)
      expect(affix.description.length).toBeGreaterThan(0)
      expect(affix.triggerChance).toBeGreaterThan(0)
      expect(affix.triggerChance).toBeLessThanOrEqual(1)
    }
  })

  describe('rollAffixes', () => {
    it('should return correct count of affixes', () => {
      const pool: EnemyAffix[] = ['berserk', 'shield', 'spiritDrain', 'swift', 'tribulationBane']
      const result = rollAffixes(pool, 2)
      expect(result).toHaveLength(2)
    })

    it('should return unique affixes', () => {
      const pool: EnemyAffix[] = ['berserk', 'shield', 'spiritDrain', 'swift', 'tribulationBane']
      const result = rollAffixes(pool, 3)
      const unique = new Set(result)
      expect(unique.size).toBe(result.length)
    })

    it('should return all affixes when count >= pool size', () => {
      const pool: EnemyAffix[] = ['berserk', 'shield']
      const result = rollAffixes(pool, 5)
      expect(result).toHaveLength(2)
      expect(result).toContain('berserk')
      expect(result).toContain('shield')
    })

    it('should return empty array for count 0', () => {
      const pool: EnemyAffix[] = ['berserk', 'shield']
      const result = rollAffixes(pool, 0)
      expect(result).toHaveLength(0)
    })

    it('should only select from the provided pool', () => {
      const pool: EnemyAffix[] = ['berserk', 'shield']
      const result = rollAffixes(pool, 2)
      for (const a of result) {
        expect(pool).toContain(a)
      }
    })
  })
})
