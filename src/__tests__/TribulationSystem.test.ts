import { describe, it, expect } from 'vitest'
import { resolveTribulation, shouldTriggerTribulation } from '../systems/cultivation/TribulationSystem'
import type { Character } from '../types/character'

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'test-char',
    name: '测试弟子',
    title: 'disciple',
    quality: 'spirit',
    realm: 1,
    realmStage: 3 as const,
    cultivation: 10000,
    baseStats: { hp: 200, atk: 20, def: 10, spd: 12, crit: 0.05, critDmg: 1.5 },
    cultivationStats: { spiritPower: 100, maxSpiritPower: 100, comprehension: 10, spiritualRoot: 15, fortune: 5 },
    learnedTechniques: ['qingxin'],
    equippedGear: [null, null, null, null],
    equippedSkills: [null, null, null, null, null],
    backpack: [],
    maxBackpackSlots: 20,
    petIds: [],
    talents: [],
    status: 'cultivating',
    injuryTimer: 0,
    createdAt: Date.now(),
    totalCultivation: 0,
    ...overrides,
  }
}

describe('shouldTriggerTribulation', () => {
  it('returns false for sub-level breakthrough (stage 0→1)', () => {
    expect(shouldTriggerTribulation(1, 0)).toBe(false)
  })

  it('returns false for major breakthrough to realm 1 (zhuji - no tribulationPower)', () => {
    expect(shouldTriggerTribulation(0, 3)).toBe(false)
  })

  it('returns true for major breakthrough to realm 2 (jindan - has tribulationPower 0.8)', () => {
    expect(shouldTriggerTribulation(1, 3)).toBe(true)
  })

  it('returns true for major breakthrough to realm 3 (yuanying - has tribulationPower)', () => {
    expect(shouldTriggerTribulation(2, 3)).toBe(true)
  })

  it('returns false for major breakthrough to realm 5 (feisheng - no tribulationPower)', () => {
    expect(shouldTriggerTribulation(4, 3)).toBe(false)
  })
})

describe('resolveTribulation', () => {
  it('returns object with success field', () => {
    const char = makeCharacter({ realm: 2, realmStage: 3 })
    const result = resolveTribulation(char)
    expect(result).toHaveProperty('success')
    if (!result.success) {
      expect(result).toHaveProperty('severe')
      expect(result).toHaveProperty('injuryTimer')
    }
  })

  it('higher spiritualRoot reduces failure rate (statistical test)', () => {
    const lowRoot = makeCharacter({ realm: 2, realmStage: 3, cultivationStats: { ...makeCharacter().cultivationStats, spiritualRoot: 5 } })
    const highRoot = makeCharacter({ realm: 2, realmStage: 3, cultivationStats: { ...makeCharacter().cultivationStats, spiritualRoot: 40 } })

    let lowFails = 0
    let highFails = 0
    const runs = 2000

    for (let i = 0; i < runs; i++) {
      if (!resolveTribulation(lowRoot).success) lowFails++
      if (!resolveTribulation(highRoot).success) highFails++
    }

    expect(highFails).toBeLessThan(lowFails)
  })

  it('failure result has injuryTimer between 60 and 120', () => {
    let foundFailure = false
    for (let i = 0; i < 5000; i++) {
      const char = makeCharacter({ realm: 2, realmStage: 3 })
      const result = resolveTribulation(char)
      if (!result.success) {
        foundFailure = true
        expect(result.injuryTimer).toBeGreaterThanOrEqual(60)
        expect(result.injuryTimer).toBeLessThanOrEqual(120)
        if (result.severe) {
          expect(result.injuryTimer).toBe(120)
        }
        break
      }
    }
    expect(foundFailure).toBe(true)
  })
})
