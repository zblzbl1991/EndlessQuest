import { rollCultivationPath, getPathDef, getPathStatBonus, getPathName } from '../data/cultivationPaths'
import { applyPathStatBonuses, needsCultivationPathChoice } from '../systems/character/CultivationPathSystem'
import type { BaseStats } from '../types/character'

describe('CultivationPathSystem', () => {
  describe('rollCultivationPath', () => {
    it('should return a valid CultivationPath value', () => {
      const validPaths = ['none', 'sword', 'body', 'alchemy', 'beast', 'formation', 'void']
      for (let i = 0; i < 200; i++) {
        const path = rollCultivationPath('common')
        expect(validPaths).toContain(path)
      }
    })

    it('should return non-none paths at higher rates for higher quality', () => {
      let commonNonNone = 0
      let divineNonNone = 0
      const n = 1000
      for (let i = 0; i < n; i++) {
        if (rollCultivationPath('common') !== 'none') commonNonNone++
        if (rollCultivationPath('divine') !== 'none') divineNonNone++
      }
      // divine (50% chance) should get more paths than common (20% chance)
      expect(divineNonNone).toBeGreaterThan(commonNonNone)
    })
  })

  describe('getPathDef', () => {
    it('should return null for "none"', () => {
      expect(getPathDef('none')).toBeNull()
    })

    it('should return a definition for each valid path', () => {
      const paths: Array<'sword' | 'body' | 'alchemy' | 'beast' | 'formation' | 'void'> = [
        'sword',
        'body',
        'alchemy',
        'beast',
        'formation',
        'void',
      ]
      for (const p of paths) {
        const def = getPathDef(p)
        expect(def).not.toBeNull()
        expect(def!.id).toBe(p)
        expect(def!.name).toBeTruthy()
        expect(def!.bonuses.length).toBeGreaterThan(0)
      }
    })
  })

  describe('getPathStatBonus', () => {
    it('should return 1 for "none" path', () => {
      expect(getPathStatBonus('none', 'atk')).toBe(1)
      expect(getPathStatBonus('none', 'hp')).toBe(1)
    })

    it('should return 1 for an unrelated stat', () => {
      // sword boosts atk and spd, not hp
      expect(getPathStatBonus('sword', 'hp')).toBe(1)
      expect(getPathStatBonus('sword', 'def')).toBe(1)
    })

    it('should return correct multiplier for sword atk', () => {
      expect(getPathStatBonus('sword', 'atk')).toBe(1.2)
    })

    it('should return correct multiplier for body hp', () => {
      expect(getPathStatBonus('body', 'hp')).toBe(1.25)
    })

    it('should return correct multiplier for void crit and critDmg', () => {
      expect(getPathStatBonus('void', 'crit')).toBe(1.15)
      expect(getPathStatBonus('void', 'critDmg')).toBe(1.3)
    })
  })

  describe('getPathName', () => {
    it('should return empty string for none', () => {
      expect(getPathName('none')).toBe('')
    })

    it('should return the correct name for each path', () => {
      expect(getPathName('sword')).toBe('剑修')
      expect(getPathName('body')).toBe('体修')
      expect(getPathName('alchemy')).toBe('丹修')
      expect(getPathName('beast')).toBe('驭兽')
      expect(getPathName('formation')).toBe('阵修')
      expect(getPathName('void')).toBe('虚空')
    })
  })

  describe('applyPathStatBonuses', () => {
    const baseStats: BaseStats = {
      hp: 100,
      atk: 15,
      def: 8,
      spd: 10,
      crit: 5,
      critDmg: 150,
    }

    it('should return unchanged stats for "none" path', () => {
      const result = applyPathStatBonuses(baseStats, 'none')
      expect(result.hp).toBe(100)
      expect(result.atk).toBe(15)
      expect(result.def).toBe(8)
      expect(result.spd).toBe(10)
      expect(result.crit).toBe(5)
      expect(result.critDmg).toBe(150)
    })

    it('should boost atk and spd for sword path', () => {
      const result = applyPathStatBonuses(baseStats, 'sword')
      expect(result.atk).toBe(Math.floor(15 * 1.2)) // 18
      expect(result.spd).toBe(Math.floor(10 * 1.1)) // 11
      expect(result.hp).toBe(100) // unchanged
      expect(result.def).toBe(8) // unchanged
    })

    it('should boost hp and def for body path', () => {
      const result = applyPathStatBonuses(baseStats, 'body')
      expect(result.hp).toBe(Math.floor(100 * 1.25)) // 125
      expect(result.def).toBe(Math.floor(8 * 1.15)) // 9
      expect(result.atk).toBe(15) // unchanged
    })

    it('should boost crit and critDmg for void path', () => {
      const result = applyPathStatBonuses(baseStats, 'void')
      expect(result.crit).toBe(5.75)
      expect(result.critDmg).toBe(150 * 1.3) // 195
    })
  })

  describe('needsCultivationPathChoice', () => {
    it('should require a path choice at the first major breakthrough node', () => {
      expect(needsCultivationPathChoice({ cultivationPath: 'none', realm: 0, realmStage: 3 })).toBe(true)
    })

    it('should not require a path choice after a path is selected', () => {
      expect(needsCultivationPathChoice({ cultivationPath: 'sword', realm: 0, realmStage: 3 })).toBe(false)
    })

    it('should not require a path choice outside the first major breakthrough', () => {
      expect(needsCultivationPathChoice({ cultivationPath: 'none', realm: 0, realmStage: 2 })).toBe(false)
      expect(needsCultivationPathChoice({ cultivationPath: 'none', realm: 1, realmStage: 3 })).toBe(false)
    })
  })
})
