export type Element = 'metal' | 'wood' | 'earth' | 'water' | 'fire' | 'neutral'
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

export const ELEMENT_NAMES: Record<Element, string> = {
  metal: '金',
  wood: '木',
  earth: '土',
  water: '水',
  fire: '火',
  neutral: '无',
}

export const COUNTER_MAP: Partial<Record<Element, Element>> = {
  metal: 'wood', // 金克木
  wood: 'earth', // 木克土
  earth: 'water', // 土克水
  water: 'fire', // 水克火
  fire: 'metal', // 火克金
}

// neutral vs any = 1.0 (no counter, no weakness)
