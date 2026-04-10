import { rollAffixes, resolveAffix } from '../systems/character/TalentAffixGenerator'
import { TALENT_AFFIXES, getAffixesByPosition, getAffixesByRarity, getAffixById } from '../data/talentAffixes'
import type { CharacterQuality } from '../types/character'
import type { TalentAffixRarity } from '../types/talent'

describe('TalentAffixGenerator', () => {
  describe('rollAffixes - common quality', () => {
    it('should only produce common rarity affixes for common quality', () => {
      for (let i = 0; i < 200; i++) {
        const result = rollAffixes('common')
        if (result.prefix) {
          expect(result.prefix.rarity).toBe('common')
        }
        if (result.suffix) {
          expect(result.suffix.rarity).toBe('common')
        }
      }
    })
  })

  describe('rollAffixes - chaos quality', () => {
    it('should only produce epic or legendary rarity affixes for chaos quality', () => {
      for (let i = 0; i < 200; i++) {
        const result = rollAffixes('chaos')
        if (result.prefix) {
          expect(['epic', 'legendary']).toContain(result.prefix.rarity)
        }
        if (result.suffix) {
          expect(['epic', 'legendary']).toContain(result.suffix.rarity)
        }
      }
    })
  })

  describe('rollAffixes - resolved values', () => {
    it('should produce resolved effects with values greater than 0', () => {
      for (let i = 0; i < 100; i++) {
        const result = rollAffixes('immortal')
        const instances = [result.prefix, result.suffix].filter(Boolean)
        for (const inst of instances) {
          for (const eff of inst!.resolvedEffects) {
            expect(eff.value).toBeGreaterThan(0)
          }
        }
      }
    })
  })

  describe('rollAffixes - statistical prefix/suffix rates for common', () => {
    it('should produce prefixes roughly 60% of the time for common quality', () => {
      let prefixCount = 0
      let suffixCount = 0
      const trials = 2000
      for (let i = 0; i < trials; i++) {
        const result = rollAffixes('common')
        if (result.prefix) prefixCount++
        if (result.suffix) suffixCount++
      }
      // Prefix chance is 0.6, allow 10% margin
      expect(prefixCount / trials).toBeGreaterThan(0.5)
      expect(prefixCount / trials).toBeLessThan(0.7)
      // Suffix chance is 0.3, allow 10% margin
      expect(suffixCount / trials).toBeGreaterThan(0.2)
      expect(suffixCount / trials).toBeLessThan(0.4)
    })
  })

  describe('rollAffixes - position correctness', () => {
    it('should always assign prefix position to prefix results', () => {
      for (let i = 0; i < 200; i++) {
        const result = rollAffixes('immortal')
        if (result.prefix) {
          expect(result.prefix.position).toBe('prefix')
        }
        if (result.suffix) {
          expect(result.suffix.position).toBe('suffix')
        }
      }
    })
  })

  describe('rollAffixes - all qualities produce valid instances', () => {
    const qualities: CharacterQuality[] = ['common', 'spirit', 'immortal', 'divine', 'chaos']
    for (const q of qualities) {
      it(`quality ${q} should produce valid TalentAffixInstance objects`, () => {
        // Run many times to ensure at least some produce both prefix and suffix
        for (let i = 0; i < 100; i++) {
          const result = rollAffixes(q)
          if (result.prefix) {
            expect(result.prefix.affixId).toBeTruthy()
            expect(result.prefix.name.length).toBeGreaterThan(0)
            expect(result.prefix.description.length).toBeGreaterThan(0)
            expect(result.prefix.resolvedEffects.length).toBeGreaterThan(0)
          }
          if (result.suffix) {
            expect(result.suffix.affixId).toBeTruthy()
            expect(result.suffix.name.length).toBeGreaterThan(0)
            expect(result.suffix.description.length).toBeGreaterThan(0)
            expect(result.suffix.resolvedEffects.length).toBeGreaterThan(0)
          }
        }
      })
    }
  })

  describe('resolveAffix', () => {
    it('should resolve all effects and respect min/max bounds', () => {
      const affix = getAffixById('prefix_legend_bati')!
      expect(affix).toBeDefined()

      for (let i = 0; i < 50; i++) {
        const instance = resolveAffix(affix)
        expect(instance.affixId).toBe('prefix_legend_bati')
        expect(instance.name).toBe('霸体')
        expect(instance.resolvedEffects).toHaveLength(3)

        // hp: 25~50
        const hpEff = instance.resolvedEffects.find((e) => e.stat === 'hp')!
        expect(hpEff.value).toBeGreaterThanOrEqual(25)
        expect(hpEff.value).toBeLessThanOrEqual(50)
        // atk: 5~10
        const atkEff = instance.resolvedEffects.find((e) => e.stat === 'atk')!
        expect(atkEff.value).toBeGreaterThanOrEqual(5)
        expect(atkEff.value).toBeLessThanOrEqual(10)
        // def: 4~8
        const defEff = instance.resolvedEffects.find((e) => e.stat === 'def')!
        expect(defEff.value).toBeGreaterThanOrEqual(4)
        expect(defEff.value).toBeLessThanOrEqual(8)
      }
    })

    it('should resolve modifier effects with correct target', () => {
      const affix = getAffixById('prefix_legend_daoti')!
      for (let i = 0; i < 30; i++) {
        const instance = resolveAffix(affix)
        expect(instance.resolvedEffects).toHaveLength(2)
        const cultivationEff = instance.resolvedEffects.find((e) => e.target === 'cultivationSpeed')!
        expect(cultivationEff).toBeDefined()
        expect(cultivationEff.value).toBeGreaterThanOrEqual(0.15)
        expect(cultivationEff.value).toBeLessThanOrEqual(0.25)
        const breakthroughEff = instance.resolvedEffects.find((e) => e.target === 'breakthroughSuccess')!
        expect(breakthroughEff).toBeDefined()
        expect(breakthroughEff.value).toBeGreaterThanOrEqual(0.1)
        expect(breakthroughEff.value).toBeLessThanOrEqual(0.2)
      }
    })

    it('should resolve conditional effects with trigger and threshold', () => {
      const affix = getAffixById('suffix_epic_busi')!
      for (let i = 0; i < 30; i++) {
        const instance = resolveAffix(affix)
        expect(instance.resolvedEffects).toHaveLength(1)
        const eff = instance.resolvedEffects[0]
        expect(eff.type).toBe('conditional')
        expect(eff.trigger).toBe('lowHp')
        expect(eff.threshold).toBe(0.3)
        expect(eff.stat).toBe('hp')
        expect(eff.value).toBeGreaterThanOrEqual(20)
        expect(eff.value).toBeLessThanOrEqual(40)
      }
    })

    it('should resolve chance effects', () => {
      const affix = getAffixById('suffix_epic_lianji')!
      for (let i = 0; i < 30; i++) {
        const instance = resolveAffix(affix)
        expect(instance.resolvedEffects).toHaveLength(1)
        const eff = instance.resolvedEffects[0]
        expect(eff.type).toBe('chance')
        expect(eff.value).toBeGreaterThanOrEqual(0.08)
        expect(eff.value).toBeLessThanOrEqual(0.15)
      }
    })
  })
})

describe('talentAffixes data', () => {
  it('should contain exactly 80 affixes', () => {
    expect(TALENT_AFFIXES).toHaveLength(80)
  })

  it('should contain 40 prefixes and 40 suffixes', () => {
    expect(getAffixesByPosition('prefix')).toHaveLength(40)
    expect(getAffixesByPosition('suffix')).toHaveLength(40)
  })

  it('should have valid IDs, names, and effects for all 80 affixes', () => {
    const ids = new Set<string>()
    for (const affix of TALENT_AFFIXES) {
      // Unique non-empty id
      expect(affix.id.length).toBeGreaterThan(0)
      expect(ids.has(affix.id)).toBe(false)
      ids.add(affix.id)

      // Non-empty name and description
      expect(affix.name.length).toBeGreaterThan(0)
      expect(affix.description.length).toBeGreaterThan(0)

      // Valid position and rarity
      expect(['prefix', 'suffix']).toContain(affix.position)
      expect(['common', 'rare', 'epic', 'legendary']).toContain(affix.rarity)

      // At least one effect
      expect(affix.effects.length).toBeGreaterThan(0)

      // Validate each effect
      for (const eff of affix.effects) {
        if (eff.type === 'flatStat') {
          expect(eff.minValue).toBeLessThanOrEqual(eff.maxValue)
          expect(eff.stat.length).toBeGreaterThan(0)
        } else if (eff.type === 'elementDamage') {
          expect(eff.minValue).toBeLessThanOrEqual(eff.maxValue)
          expect(eff.element.length).toBeGreaterThan(0)
        } else if (eff.type === 'conditional') {
          expect(eff.effect.minValue).toBeLessThanOrEqual(eff.effect.maxValue)
          expect(eff.trigger.length).toBeGreaterThan(0)
          expect(eff.effect.stat.length).toBeGreaterThan(0)
        } else if (eff.type === 'chance') {
          expect(eff.minValue).toBeLessThanOrEqual(eff.maxValue)
          expect(eff.description.length).toBeGreaterThan(0)
          expect(eff.effect.stat.length).toBeGreaterThan(0)
        } else if (eff.type === 'modifier') {
          expect(eff.minValue).toBeLessThanOrEqual(eff.maxValue)
          expect(eff.target.length).toBeGreaterThan(0)
        }
      }
    }
  })

  it('should have correct rarity distribution: 15 common, 12 rare, 8 epic, 5 legendary per position', () => {
    const positions = ['prefix', 'suffix'] as const
    for (const pos of positions) {
      expect(getAffixesByRarity('common', pos)).toHaveLength(15)
      expect(getAffixesByRarity('rare', pos)).toHaveLength(12)
      expect(getAffixesByRarity('epic', pos)).toHaveLength(8)
      expect(getAffixesByRarity('legendary', pos)).toHaveLength(5)
    }
  })

  it('getAffixById should return the correct affix', () => {
    const affix = getAffixById('prefix_common_wuti')
    expect(affix).toBeDefined()
    expect(affix!.name).toBe('武体')
    expect(affix!.position).toBe('prefix')
    expect(affix!.rarity).toBe('common')
  })

  it('getAffixById should return undefined for unknown id', () => {
    expect(getAffixById('nonexistent')).toBeUndefined()
  })

  it('getAffixesByRarity without position should return all affixes of that rarity', () => {
    expect(getAffixesByRarity('common')).toHaveLength(30) // 15 prefix + 15 suffix
    expect(getAffixesByRarity('rare')).toHaveLength(24) // 12 + 12
    expect(getAffixesByRarity('epic')).toHaveLength(16) // 8 + 8
    expect(getAffixesByRarity('legendary')).toHaveLength(10) // 5 + 5
  })
})
