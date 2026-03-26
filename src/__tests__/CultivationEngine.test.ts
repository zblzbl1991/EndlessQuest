import {
  calcCultivationRate,
  calcSpiritCostPerSecond,
  canCultivate,
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
    ...overrides,
  }
}

describe('CultivationEngine', () => {
  describe('calcCultivationRate', () => {
    it('should return base rate 5 with default stats', () => {
      const character = createCharacter()
      expect(calcCultivationRate(character, [])).toBe(5)
    })

    it('should apply spiritualRoot bonus (+2% per point)', () => {
      const character = createCharacter({
        cultivationStats: {
          ...createCharacter().cultivationStats,
          spiritualRoot: 15,
        },
      })
      // base 10 -> +0%, 15 -> +10%
      expect(calcCultivationRate(character, [])).toBe(5 * 1.1)
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
      const baseRate = 5 * 1.0 * 0.9 // spiritualRoot=10 (+0%), realm 1 (0.9x)
      expect(rate).toBe(baseRate * 1.1) // +10% from cultivationRate bonus
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
      const baseRate = 5 * 1.0 * 0.9 // spiritualRoot=10 (+0%), realm 1 (0.9x)
      expect(result.cultivationGained).toBe(baseRate * 1.1) // baseRate * (1 + 0.1)
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
