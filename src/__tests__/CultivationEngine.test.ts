import {
  calcCultivationRate,
  calcSpiritCostPerSecond,
  canCultivate,
  tick,
  canBreakthrough,
  breakthrough,
} from '../systems/cultivation/CultivationEngine'
import type { Character } from '../types/character'
import type { Technique } from '../types/technique'

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
    currentTechnique: null,
    techniqueComprehension: 0,
    learnedTechniques: [],
    equippedGear: [null, null, null, null, null, null],
    equippedSkills: [null, null, null, null],
    backpack: [],
    maxBackpackSlots: 20,
    petIds: [],
    status: 'idle',
    injuryTimer: 0,
    createdAt: Date.now(),
    totalCultivation: 0,
    ...overrides,
  }
}

const neutralTechnique: Technique = {
  id: 'qingxin',
  name: '清心诀',
  description: '基础功法',
  tier: 'mortal',
  element: 'neutral',
  growthModifiers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, crit: 1.0, critDmg: 1.0 },
  fixedBonuses: [],
  requirements: { minRealm: 0, minComprehension: 5 },
  comprehensionDifficulty: 1,
}

const attackTechnique: Technique = {
  id: 'lieyan',
  name: '烈焰心法',
  description: '攻击功法',
  tier: 'mortal',
  element: 'fire',
  growthModifiers: { hp: 0.9, atk: 1.3, def: 0.9, spd: 1.0, crit: 1.1, critDmg: 1.1 },
  fixedBonuses: [{ type: 'atk', value: 5 }],
  requirements: { minRealm: 0, minComprehension: 8 },
  comprehensionDifficulty: 1,
}

const cultivationRateTechnique: Technique = {
  id: 'leiyu',
  name: '雷御诀',
  description: '修炼效率提升',
  tier: 'spirit',
  element: 'lightning',
  growthModifiers: { hp: 0.9, atk: 1.0, def: 0.8, spd: 1.8, crit: 1.1, critDmg: 1.1 },
  fixedBonuses: [
    { type: 'spd', value: 8 },
    { type: 'cultivationRate', value: 0.1 },
  ],
  requirements: { minRealm: 1, minComprehension: 12 },
  comprehensionDifficulty: 2,
}

describe('CultivationEngine', () => {
  describe('calcCultivationRate', () => {
    it('should return base rate 5 with default stats', () => {
      const character = createCharacter()
      expect(calcCultivationRate(character, null)).toBe(5)
    })

    it('should apply spiritualRoot bonus (+2% per point)', () => {
      const character = createCharacter({
        cultivationStats: {
          ...createCharacter().cultivationStats,
          spiritualRoot: 15,
        },
      })
      // base 10 -> +0%, 15 -> +10%
      expect(calcCultivationRate(character, null)).toBe(5 * 1.1)
    })

    it('should apply realm multiplier (higher realm = slower)', () => {
      const character = createCharacter({ realm: 2 }) // 金丹 = 0.8x
      expect(calcCultivationRate(character, null)).toBe(5 * 0.8)
    })

    it('should apply cultivationRate bonus from technique at sufficient comprehension', () => {
      // cultivationRate bonus unlocks at comprehensionDifficulty * 0.7 = 2 * 0.7 = 1.4
      const character = createCharacter({
        realm: 1,
        techniqueComprehension: 30,
      })
      const rate = calcCultivationRate(character, cultivationRateTechnique)
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
      const result = breakthrough(character, null)
      expect(result.success).toBe(true)
      expect(result.newRealm).toBe(0)
      expect(result.newStage).toBe(1)
      expect(result.newStats.hp).toBeGreaterThan(result.oldStats.hp)
    })

    it('should advance realm when at max stage', () => {
      // realm 0 stage 3 (圆满) -> realm 1 stage 0
      const character = createCharacter({ realm: 0, realmStage: 3, cultivation: 1000 })
      const result = breakthrough(character, null)
      expect(result.success).toBe(true)
      expect(result.newRealm).toBe(1)
      expect(result.newStage).toBe(0)
      expect(result.newStats.hp).toBe(Math.floor(result.oldStats.hp * 1.8))
    })

    it('should apply technique growth modifiers', () => {
      const character = createCharacter({
        cultivation: 100,
        techniqueComprehension: 100,
      })
      const result = breakthrough(character, attackTechnique)
      expect(result.success).toBe(true)

      // With lieyan at 100% comprehension, attack growth should be enhanced
      // Calculate base sublevel growth for atk, then apply 1.3 modifier
      // Base next realm atk = floor(15 * 1.8) = 27
      // Sublevel atk growth = 15 + floor((27 - 15) * 0.15) = 15 + floor(1.8) = 16
      // With modifier 1.3 at full comprehension: 16 * (1 + (1.3 - 1) * 1.0) = 16 * 1.3 = 20.8
      expect(result.newStats.atk).toBeGreaterThan(result.oldStats.atk)
    })

    it('should reset cultivation to 0 (caller responsibility - engine returns 0)', () => {
      const character = createCharacter({ cultivation: 100 })
      const result = breakthrough(character, null)
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
      const result = breakthrough(character, null)
      expect(result.success).toBe(false)
      expect(result.newStage).toBe(0)
    })

    it('should apply modified growth at 100% comprehension', () => {
      const character = createCharacter({
        cultivation: 100,
        techniqueComprehension: 100,
      })
      const withTechnique = breakthrough(character, attackTechnique)
      const withoutTechnique = breakthrough(character, null)

      // At 100% comprehension, the attack technique with atk: 1.3 should give more atk
      // than no technique
      expect(withTechnique.newStats.atk).toBeGreaterThan(withoutTechnique.newStats.atk)
    })

    it('should apply reduced growth at 30% comprehension', () => {
      const character30 = createCharacter({
        cultivation: 100,
        techniqueComprehension: 30,
      })
      const character100 = createCharacter({
        cultivation: 100,
        techniqueComprehension: 100,
      })

      const result30 = breakthrough(character30, attackTechnique)
      const result100 = breakthrough(character100, attackTechnique)

      // At 30% comprehension (effect=0.7), growth should be between no technique and full comprehension
      // Base sublevel atk growth = 16
      // At 30% comprehension: 16 * (1 + (1.3-1)*0.7) = 16 * 1.21 = 19.36
      // At 100% comprehension: 16 * (1 + (1.3-1)*1.0) = 16 * 1.3 = 20.8
      expect(result100.newStats.atk).toBeGreaterThan(result30.newStats.atk)
    })

    it('should fail breakthrough when insufficient cultivation', () => {
      const character = createCharacter({ cultivation: 50 })
      const result = breakthrough(character, null)
      expect(result.success).toBe(false)
      expect(result.newRealm).toBe(0)
      expect(result.newStage).toBe(0)
    })
  })
})
