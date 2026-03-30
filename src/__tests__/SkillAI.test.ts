import { selectAction } from '../systems/combat/SkillAI'
import type { ActiveSkill } from '../types/skill'
import type { TacticalPreset } from '../types/adventure'

function makeSkill(overrides: Partial<ActiveSkill> & { id: string }): ActiveSkill {
  return {
    name: 'Test Skill',
    category: 'attack',
    element: 'neutral',
    multiplier: 1.5,
    spiritCost: 10,
    cooldown: 0,
    description: '',
    tier: 1,
    ...overrides,
  }
}

const defaultContext = {
  hpPercent: 1.0,
  spiritPower: 100,
  maxSpiritPower: 100,
  isBossFight: false,
}

describe('SkillAI', () => {
  describe('conservative preset', () => {
    it('should prefer defense/support skills when HP < 40%', () => {
      const skills = [
        makeSkill({ id: 'atk1', category: 'attack', spiritCost: 10 }),
        makeSkill({ id: 'def1', category: 'defense', spiritCost: 10 }),
        makeSkill({ id: 'sup1', category: 'support', spiritCost: 10 }),
      ]
      const result = selectAction(skills, {}, { ...defaultContext, hpPercent: 0.3 }, 'conservative')
      expect(result).not.toBeNull()
      expect(result!.category).toMatch(/defense|support/)
    })

    it('should use attack skill when HP >= 40%', () => {
      const skills = [
        makeSkill({ id: 'atk1', category: 'attack', spiritCost: 10 }),
        makeSkill({ id: 'def1', category: 'defense', spiritCost: 10 }),
      ]
      const result = selectAction(skills, {}, { ...defaultContext, hpPercent: 0.6 }, 'conservative')
      expect(result).not.toBeNull()
      expect(result!.id).toBe('atk1')
    })

    it('should fall back to attack when HP low but no defense/support available', () => {
      const skills = [makeSkill({ id: 'atk1', category: 'attack', spiritCost: 10 })]
      const result = selectAction(skills, {}, { ...defaultContext, hpPercent: 0.2 }, 'conservative')
      expect(result).not.toBeNull()
      expect(result!.id).toBe('atk1')
    })
  })

  describe('burst preset', () => {
    it('should prefer highest multiplier attack skill', () => {
      const skills = [
        makeSkill({ id: 'weak', category: 'attack', multiplier: 1.0, spiritCost: 5 }),
        makeSkill({ id: 'strong', category: 'attack', multiplier: 3.0, spiritCost: 20 }),
      ]
      const result = selectAction(skills, {}, defaultContext, 'burst')
      expect(result).not.toBeNull()
      expect(result!.id).toBe('strong')
    })

    it('should include ultimate skills in selection', () => {
      const skills = [
        makeSkill({ id: 'atk1', category: 'attack', multiplier: 1.5, spiritCost: 10 }),
        makeSkill({ id: 'ult1', category: 'ultimate', multiplier: 4.0, spiritCost: 30 }),
      ]
      const result = selectAction(skills, {}, defaultContext, 'burst')
      expect(result).not.toBeNull()
      expect(result!.id).toBe('ult1')
    })

    it('should fall back to first available when no attack/ultimate available', () => {
      const skills = [makeSkill({ id: 'sup1', category: 'support', multiplier: 0, spiritCost: 10 })]
      const result = selectAction(skills, {}, defaultContext, 'burst')
      expect(result).not.toBeNull()
      expect(result!.id).toBe('sup1')
    })
  })

  describe('bossCounter preset', () => {
    it('should return null (use normal attack) when not in boss fight', () => {
      const skills = [makeSkill({ id: 'atk1', category: 'attack', spiritCost: 10 })]
      const result = selectAction(skills, {}, { ...defaultContext, isBossFight: false }, 'bossCounter')
      expect(result).toBeNull()
    })

    it('should prefer ultimate or high-multiplier skills in boss fight', () => {
      const skills = [
        makeSkill({ id: 'basic', category: 'attack', multiplier: 1.0, spiritCost: 5 }),
        makeSkill({ id: 'ult', category: 'ultimate', multiplier: 3.5, spiritCost: 30 }),
      ]
      const result = selectAction(skills, {}, { ...defaultContext, isBossFight: true }, 'bossCounter')
      expect(result).not.toBeNull()
      expect(result!.id).toBe('ult')
    })

    it('should select skills with multiplier >= 2.0 in boss fight', () => {
      const skills = [
        makeSkill({ id: 'basic', category: 'attack', multiplier: 1.0, spiritCost: 5 }),
        makeSkill({ id: 'heavy', category: 'attack', multiplier: 2.5, spiritCost: 20 }),
      ]
      const result = selectAction(skills, {}, { ...defaultContext, isBossFight: true }, 'bossCounter')
      expect(result).not.toBeNull()
      expect(result!.id).toBe('heavy')
    })
  })

  describe('balanced preset', () => {
    it('should select first available attack skill', () => {
      const skills = [
        makeSkill({ id: 'sup1', category: 'support', spiritCost: 10 }),
        makeSkill({ id: 'atk1', category: 'attack', spiritCost: 10 }),
      ]
      const result = selectAction(skills, {}, defaultContext, 'balanced')
      expect(result).not.toBeNull()
      expect(result!.id).toBe('atk1')
    })

    it('should fall back to first available skill when no attack skill', () => {
      const skills = [
        makeSkill({ id: 'def1', category: 'defense', spiritCost: 10 }),
        makeSkill({ id: 'sup1', category: 'support', spiritCost: 10 }),
      ]
      const result = selectAction(skills, {}, defaultContext, 'balanced')
      expect(result).not.toBeNull()
      expect(result!.id).toBe('def1')
    })
  })

  describe('shared behavior', () => {
    it('should skip skills on cooldown', () => {
      const skills = [makeSkill({ id: 'cd1', category: 'attack', spiritCost: 10 })]
      const result = selectAction(skills, { cd1: 2 }, defaultContext, 'balanced')
      expect(result).toBeNull()
    })

    it('should skip skills that cost more than current spiritPower', () => {
      const skills = [makeSkill({ id: 'expensive', category: 'attack', spiritCost: 100 })]
      const result = selectAction(skills, {}, { ...defaultContext, spiritPower: 50 }, 'balanced')
      expect(result).toBeNull()
    })

    it('should return null when no skills available', () => {
      const result = selectAction([], {}, defaultContext, 'balanced')
      expect(result).toBeNull()
    })
  })
})
