import { describe, it, expect } from 'vitest'
import {
  REALMS,
  REALM_EXP,
  BREAKTHROUGH_COSTS,
  getRealmCost,
  getRealmSpeedMult,
  getRealmEconomyMult,
  PACING_FIRST_REALM_SECONDS,
  PACING_TIME_GROWTH,
} from '../data/realms'
import { calcCultivationRate } from '../systems/cultivation/CultivationEngine'
import type { Character } from '../types/character'

const BASE_CULTIVATION_RATE = 5

function baseCharacter(overrides?: Partial<Character>): Character {
  return {
    id: 'pacer',
    name: 'pace',
    title: 'disciple',
    quality: 'common',
    realm: 0,
    realmStage: 0,
    cultivation: 0,
    baseStats: { hp: 100, atk: 15, def: 8, spd: 10, crit: 0.05, critDmg: 1.5 },
    cultivationStats: {
      spiritPower: 50,
      maxSpiritPower: 50,
      comprehension: 10,
      spiritualRoot: 10,
      fortune: 5,
    },
    learnedTechniques: [],
    equippedGear: [null, null, null, null, null, null, null, null, null],
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
    cultivationPath: 'sword',
    investedSpiritStone: 0,
    techniqueComprehension: {},
    ...overrides,
  }
}

/** Natural time to cross realm i for a character of the given strength factor. */
function realmSeconds(realmIndex: number, charFactor: number): number {
  const rate = BASE_CULTIVATION_RATE * charFactor * getRealmSpeedMult(realmIndex)
  return getRealmCost(realmIndex) / rate
}

/** Spirit stone income per second the vanilla mine (level 1, 1 node) has at realm i. */
function stoneIncome(realmIndex: number): number {
  return 0.5 * getRealmEconomyMult(realmIndex)
}

describe('V2 pacing model (design doc §5.1 / §十三)', () => {
  it('defines exactly 13 realms (9 mortal + 4 immortal) with the agreed exponent curve', () => {
    expect([...REALM_EXP]).toEqual([2, 4, 6, 9, 13, 18, 24, 31, 40, 50, 65, 80, 100])
    expect(REALMS).toHaveLength(13)
    expect(getRealmCost(8)).toBe(1e40)
  })

  it('each realm takes ~PACING_FIRST_REALM_SECONDS × GROWTH^i for a base disciple', () => {
    const factor = 1 // base char: root 10, comp 10, no techniques
    for (let i = 0; i < REALM_EXP.length; i++) {
      const expected = PACING_FIRST_REALM_SECONDS * PACING_TIME_GROWTH ** i
      const actual = realmSeconds(i, factor)
      expect(actual / expected).toBeCloseTo(1, 5)
    }
  })

  it('realm times double per realm (no walls, no free jumps)', () => {
    for (let i = 1; i < REALM_EXP.length; i++) {
      const ratio = realmSeconds(i, 1) / realmSeconds(i - 1, 1)
      expect(ratio).toBeGreaterThan(1.9)
      expect(ratio).toBeLessThan(2.1)
    }
  })

  it('first full run lands within the §5.1 budget (3 days ±50%)', () => {
    const totalSeconds = realmSeconds(0, 1) * (PACING_TIME_GROWTH ** 9 - 1)
    const days = totalSeconds / 86400
    expect(days).toBeGreaterThan(1.5)
    expect(days).toBeLessThan(4.5)
  })

  it('spirit stone income covers each breakthrough cost within the realm duration', () => {
    for (let target = 1; target < REALM_EXP.length; target++) {
      const cost = BREAKTHROUGH_COSTS[target].spiritStone
      const realmDuration = PACING_FIRST_REALM_SECONDS * PACING_TIME_GROWTH ** (target - 1)
      const requiredRate = cost / realmDuration
      expect(stoneIncome(target)).toBeGreaterThan(requiredRate)
    }
  })

  it('talent multipliers compress the run without breaking the shape', () => {
    const genius = baseCharacter({
      cultivationStats: {
        spiritPower: 50,
        maxSpiritPower: 50,
        comprehension: 30,
        spiritualRoot: 35,
        fortune: 25,
      },
    })
    const base = baseCharacter()
    const geniusRate = calcCultivationRate(genius, [])
    const baseRate = calcCultivationRate(base, [])
    expect(geniusRate / baseRate).toBeGreaterThan(2)
    // Cultivation of a genius still respects the realm ratio (multiplicative)
    const ratioGenius = realmSeconds(3, geniusRate / (BASE_CULTIVATION_RATE * getRealmSpeedMult(0)))
    const ratioBase = realmSeconds(3, 1)
    expect(ratioGenius).toBeLessThan(ratioBase)
  })

  it('prints the pacing table for calibration', () => {
    const rows = REALM_EXP.map((exp, i) => {
      const seconds = realmSeconds(i, 1)
      return {
        境界: REALMS[i].name,
        成本: `1e${exp}`,
        速率: `${(BASE_CULTIVATION_RATE * getRealmSpeedMult(i)).toExponential(2)}/s`,
        耗时小时: (seconds / 3600).toFixed(2),
        累计天: ((realmSeconds(0, 1) * (PACING_TIME_GROWTH ** (i + 1) - 1)) / 86400).toFixed(2),
        突破灵石: BREAKTHROUGH_COSTS[i] ? BREAKTHROUGH_COSTS[i].spiritStone.toExponential(2) : '—',
      }
    })
    console.table(rows)
    expect(rows).toHaveLength(13)
  })
})
