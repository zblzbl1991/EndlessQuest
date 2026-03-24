export type Element = 'fire' | 'ice' | 'lightning' | 'healing' | 'neutral'
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
  fire: '火',
  ice: '冰',
  lightning: '雷',
  healing: '治愈',
  neutral: '无',
}

export const COUNTER_MAP: Partial<Record<Element, Element>> = {
  fire: 'ice',
  ice: 'lightning',
  lightning: 'fire',
}

// neutral vs any = 1.0 (no counter, no weakness)
