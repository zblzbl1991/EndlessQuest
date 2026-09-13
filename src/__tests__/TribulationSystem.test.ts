import { describe, it, expect } from 'vitest'
import {
  resolveTribulation,
  shouldTriggerTribulation,
  calcTribulationFailRate,
} from '../systems/cultivation/TribulationSystem'
import { REALM_EXP } from '../data/realms'
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
    status: 'idle',
    injuryTimer: 0,
    createdAt: Date.now(),
    totalCultivation: 0,
    specialties: [],
    assignedBuilding: null,
    cultivationPath: 'none',
    ...overrides,
  }
}

describe('shouldTriggerTribulation（§5.4：每个大境界突破都有天劫）', () => {
  it('小境界突破（stage 0-2）不触发', () => {
    for (let realm = 0; realm < REALM_EXP.length; realm++) {
      for (let stage = 0; stage < 3; stage++) {
        expect(shouldTriggerTribulation(realm, stage)).toBe(false)
      }
    }
  })

  it('所有大境界突破（stage 3 → 下一境）都触发，包括 →筑基', () => {
    for (let realm = 0; realm < REALM_EXP.length - 1; realm++) {
      expect(shouldTriggerTribulation(realm, 3)).toBe(true)
    }
  })

  it('最后一境圆满（无下一境）不触发', () => {
    expect(shouldTriggerTribulation(REALM_EXP.length - 1, 3)).toBe(false)
  })
})

describe('calcTribulationFailRate（§5.4 公式）', () => {
  it('基础失败率 = 0.15 + 目标境 EXP × 0.004，减去灵根/悟性', () => {
    const char = makeCharacter({ realm: 1, realmStage: 3 }) // →金丹 (EXP 6)
    // 0.15 + 6×0.004 − 15×0.005 − 10×0.003 = 0.174 − 0.075 − 0.03 = 0.069
    expect(calcTribulationFailRate(char)).toBeCloseTo(0.15 + 6 * 0.004 - 15 * 0.005 - 10 * 0.003, 6)
  })

  it('目标境界越高失败率越高', () => {
    const low = makeCharacter({ realm: 1, realmStage: 3 }) // →金丹
    const high = makeCharacter({ realm: 7, realmStage: 3 }) // →渡劫 (EXP 40)
    expect(calcTribulationFailRate(high)).toBeGreaterThan(calcTribulationFailRate(low))
  })

  it('失败率被钳制在 [0, 0.95]', () => {
    const godlike = makeCharacter({
      realm: 0,
      realmStage: 3,
      cultivationStats: { spiritPower: 100, maxSpiritPower: 100, comprehension: 99, spiritualRoot: 99, fortune: 5 },
    })
    expect(calcTribulationFailRate(godlike)).toBe(0)
    expect(calcTribulationFailRate(godlike, 1)).toBe(0)
    const doomed = makeCharacter({ realm: 7, realmStage: 3 })
    expect(calcTribulationFailRate(doomed)).toBeLessThanOrEqual(0.95)
  })

  it('legacy 加成（道心坚定）线性降低失败率', () => {
    const char = makeCharacter({ realm: 1, realmStage: 3 })
    const base = calcTribulationFailRate(char, 0)
    const withBonus = calcTribulationFailRate(char, 0.05)
    expect(base - withBonus).toBeCloseTo(0.05, 6)
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
    const lowRoot = makeCharacter({
      realm: 2,
      realmStage: 3,
      cultivationStats: { ...makeCharacter().cultivationStats, spiritualRoot: 5 },
    })
    const highRoot = makeCharacter({
      realm: 2,
      realmStage: 3,
      cultivationStats: { ...makeCharacter().cultivationStats, spiritualRoot: 40 },
    })

    let lowFails = 0
    let highFails = 0
    const runs = 2000

    for (let i = 0; i < runs; i++) {
      if (!resolveTribulation(lowRoot).success) lowFails++
      if (!resolveTribulation(highRoot).success) highFails++
    }

    expect(highFails).toBeLessThan(lowFails)
  })

  it('legacy bonus strictly reduces failures (statistical test)', () => {
    const char = makeCharacter({ realm: 2, realmStage: 3 })
    let baseFails = 0
    let boostedFails = 0
    for (let i = 0; i < 2000; i++) {
      if (!resolveTribulation(char).success) baseFails++
      if (!resolveTribulation(char, 0.2).success) boostedFails++
    }
    expect(boostedFails).toBeLessThan(baseFails)
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
