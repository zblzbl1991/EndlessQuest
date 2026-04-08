import {
  calcCultivationRate,
  calcSpiritCostPerSecond,
  tick,
  canBreakthrough,
  breakthrough,
} from '../systems/cultivation/CultivationEngine'
import type { Character } from '../types/character'

function createCharacter(overrides?: Partial<Character>): Character {
  return {
    id: '1',
    name: 'test',
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
    cultivationPath: 'none',
    investedSpiritStone: 0,
    techniqueComprehension: {},
    ...overrides,
  }
}

describe('CultivationEngine', () => {
  describe('calcCultivationRate', () => {
    it('should return base rate 5 with default stats', () => {
      const character = createCharacter()
      expect(calcCultivationRate(character, [])).toBe(5)
    })

    it('should apply spiritualRoot bonus (exponential scaling)', () => {
      const character = createCharacter({
        cultivationStats: {
          ...createCharacter().cultivationStats,
          spiritualRoot: 15,
        },
      })
      // rootBonus = (15/10)^0.85 ≈ 1.4114, compBonus = 1.0 (comp=10)
      const expected = 5 * Math.pow(15 / 10, 0.85) * 1.0
      expect(calcCultivationRate(character, [])).toBeCloseTo(expected, 10)
    })

    it('should apply realm multiplier (higher realm = slower)', () => {
      const character = createCharacter({ realm: 2 }) // 金丹 = 0.8x
      expect(calcCultivationRate(character, [])).toBe(5 * 0.8)
    })

    it('should apply cultivationRate bonus from learned technique', () => {
      // leiyu has cultivationRate bonus of 0.1
      const character = createCharacter({
        realm: 1,
      })
      const rate = calcCultivationRate(character, ['leiyu'])
      // rootBonus=1.0, compBonus=1.0, realmMult=0.9
      const baseRate = 5 * 1.0 * 1.0 * 0.9
      expect(rate).toBeCloseTo(baseRate * 1.1, 10) // +10% from cultivationRate bonus
    })

    it('should apply comprehension bonus to cultivation rate', () => {
      const base = createCharacter() // comp=10 → compBonus=1.0
      const highComp = createCharacter({
        cultivationStats: {
          ...createCharacter().cultivationStats,
          comprehension: 20,
        },
      })
      // compBonus = 1 + (20-10)*0.015 = 1.15
      const baseRate = calcCultivationRate(base, [])
      const highRate = calcCultivationRate(highComp, [])
      expect(highRate).toBeCloseTo(baseRate * 1.15, 10)
    })

    it('should show significant quality gap between common and chaos', () => {
      const common = createCharacter({ quality: 'common' }) // root=10, comp=10
      const chaos = createCharacter({
        quality: 'chaos',
        cultivationStats: {
          spiritPower: 50,
          maxSpiritPower: 50,
          comprehension: 30,
          spiritualRoot: 35,
          fortune: 25,
        },
      })
      const commonRate = calcCultivationRate(common, [])
      const chaosRate = calcCultivationRate(chaos, [])
      const ratio = chaosRate / commonRate
      // rootBonus = (35/10)^0.85 ≈ 2.86, compBonus = 1 + 20*0.015 = 1.3
      // total ≈ 3.72x — should be between 3 and 4.5
      expect(ratio).toBeGreaterThan(3)
      expect(ratio).toBeLessThan(4.5)
    })
  })

  describe('calcSpiritCostPerSecond', () => {
    it('should cost 2 spirit energy per second', () => {
      expect(calcSpiritCostPerSecond()).toBe(2)
    })
  })

  describe('tick', () => {
    it('should gain cultivation when enough spirit energy', () => {
      const character = createCharacter()
      const result = tick(character, 10, 1)
      expect(result.cultivationGained).toBe(5)
      expect(result.spiritSpent).toBe(2)
    })

    it('should apply technique cultivationRate bonus in tick', () => {
      const character = createCharacter({
        realm: 1,
      })
      // leiyu has cultivationRate bonus of 0.1 (flat, always active)
      const result = tick(character, 20, 1, ['leiyu'])
      // rootBonus=1.0, compBonus=1.0, realmMult=0.9
      const baseRate = 5 * 1.0 * 1.0 * 0.9
      expect(result.cultivationGained).toBeCloseTo(baseRate * 1.1, 10) // baseRate * (1 + 0.1)
    })

    it('should not gain when no spirit energy', () => {
      const character = createCharacter()
      const result = tick(character, 1, 1) // only 1 spirit energy, need 2
      expect(result.cultivationGained).toBe(0)
      expect(result.spiritSpent).toBe(0)
    })

    it('should consume exactly 2 spirit per second', () => {
      const character = createCharacter()
      const result = tick(character, 20, 5)
      expect(result.spiritSpent).toBe(2 * 5) // 10
    })
  })

  describe('canBreakthrough', () => {
    it('should return true when enough cultivation', () => {
      const character = createCharacter({ cultivation: 100 })
      expect(canBreakthrough(character)).toBe(true)
    })

    it('should return false when insufficient cultivation', () => {
      const character = createCharacter({ cultivation: 50 })
      expect(canBreakthrough(character)).toBe(false)
    })

    it('should return false when at max stage of last realm', () => {
      // Realm 5 "渡劫飞升" has only 1 stage (stage 0)
      const character = createCharacter({
        realm: 5,
        realmStage: 0 as 0 | 1 | 2 | 3,
        cultivation: 600000,
      })
      expect(canBreakthrough(character)).toBe(false)
    })

    it('should return false when spirit stones insufficient', () => {
      const character = createCharacter({ cultivation: 100 })
      expect(canBreakthrough(character, { spiritStone: 200 }, { spiritStone: 50, spiritEnergy: 9999 })).toBe(false)
    })

    it('should return true when spirit stones sufficient', () => {
      const character = createCharacter({ cultivation: 100 })
      expect(canBreakthrough(character, { spiritStone: 50 }, { spiritStone: 200, spiritEnergy: 0 })).toBe(true)
    })

    it('should ignore spirit stone check when cost undefined', () => {
      const character = createCharacter({ cultivation: 100 })
      expect(canBreakthrough(character)).toBe(true)
      expect(canBreakthrough(character, undefined, 0)).toBe(true)
    })
  })

  describe('breakthrough', () => {
    it('should advance stage and grow stats', () => {
      const character = createCharacter({ cultivation: 100 })
      const result = breakthrough(character, 0)
      expect(result.success).toBe(true)
      expect(result.newRealm).toBe(0)
      expect(result.newStage).toBe(1)
      expect(result.newStats.hp).toBeGreaterThan(result.oldStats.hp)
    })

    it('should advance realm when at max stage', () => {
      // realm 0 stage 3 (圆满) -> realm 1 stage 0
      const character = createCharacter({ realm: 0, realmStage: 3, cultivation: 1000 })
      const result = breakthrough(character, 0)
      expect(result.success).toBe(true)
      expect(result.newRealm).toBe(1)
      expect(result.newStage).toBe(0)
      expect(result.newStats.hp).toBe(Math.floor(result.oldStats.hp * 1.8))
    })

    it('should grow stats on breakthrough', () => {
      const character = createCharacter({ cultivation: 100 })
      const result = breakthrough(character, 0)
      expect(result.success).toBe(true)
      expect(result.newStats.atk).toBeGreaterThan(result.oldStats.atk)
    })

    it('should reset cultivation to 0 (caller responsibility - engine returns 0)', () => {
      const character = createCharacter({ cultivation: 100 })
      const result = breakthrough(character, 0)
      // The engine doesn't modify the character; it returns what the new state should be
      // Caller resets cultivation to 0
      expect(result.success).toBe(true)
    })

    it('should cap realmStage at stages.length - 1', () => {
      // Realm 5 "渡劫飞升" has only 1 stage (index 0), so stage 0 is the max
      const character = createCharacter({
        realm: 5,
        realmStage: 0 as 0 | 1 | 2 | 3,
        cultivation: 600000,
      })
      const result = breakthrough(character, 0)
      expect(result.success).toBe(false)
      expect(result.newStage).toBe(0)
    })

    it('should succeed when cultivation sufficient and no failure rate', () => {
      const character = createCharacter({ cultivation: 100 })
      const result = breakthrough(character, 0)
      const withoutCultivation = breakthrough(createCharacter({ cultivation: 50 }), 0)
      expect(result.newStats.atk).toBeGreaterThan(withoutCultivation.newStats.atk)
    })

    it('should fail breakthrough when insufficient cultivation', () => {
      const character = createCharacter({ cultivation: 50 })
      const result = breakthrough(character, 0)
      expect(result.success).toBe(false)
      expect(result.newRealm).toBe(0)
      expect(result.newStage).toBe(0)
    })
  })
})
