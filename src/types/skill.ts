export type Element = 'fire' | 'ice' | 'lightning' | 'healing'
export type SkillCategory = 'attack' | 'defense' | 'support' | 'ultimate'
export type TechniqueType = 'mental' | 'body' | 'spiritual'

export interface ActiveSkill {
  id: string
  name: string
  category: SkillCategory
  element: Element
  multiplier: number
  spiritCost: number
  cooldown: number
  description: string
  tier: number
}

export interface Technique {
  id: string
  name: string
  type: TechniqueType
  tier: number
  statBonus: Partial<{
    hp: number; atk: number; def: number; spd: number
    crit: number; critDmg: number
    spiritPower: number; comprehension: number; spiritualRoot: number; fortune: number
  }>
  description: string
}
