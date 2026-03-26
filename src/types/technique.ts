import type { Element } from './skill'

export type TechniqueTier = 'mortal' | 'spirit' | 'immortal' | 'divine' | 'chaos'

export interface TechniqueBonus {
  type: string
  value: number
}

export interface Technique {
  id: string
  name: string
  description: string
  tier: TechniqueTier
  element: Element
  bonuses: TechniqueBonus[]
  requirements: {
    minRealm: number
    minComprehension: number
  }
}

export const TECHNIQUE_TIER_NAMES: Record<TechniqueTier, string> = {
  mortal: '凡级',
  spirit: '灵级',
  immortal: '仙级',
  divine: '神级',
  chaos: '混沌级',
}

export const TECHNIQUE_TIER_ORDER: TechniqueTier[] = [
  'mortal', 'spirit', 'immortal', 'divine', 'chaos',
]
