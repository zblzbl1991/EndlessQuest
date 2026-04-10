export type TalentId = string

export type TalentStat =
  | 'spiritualRoot'
  | 'comprehension'
  | 'fortune'
  | 'hp'
  | 'atk'
  | 'def'
  | 'spd'
  | 'crit'
  | 'critDmg'
  | 'maxSpiritPower'

export type TalentRarity = 'common' | 'rare' | 'epic'

export interface TalentEffect {
  stat: TalentStat
  value: number
}

export interface Talent {
  id: TalentId
  name: string
  description: string
  effect: TalentEffect[]
  rarity: TalentRarity
}

export const TALENT_RARITY_NAMES: Record<TalentRarity, string> = {
  common: '凡',
  rare: '良',
  epic: '绝',
}

// --- Talent Affix Types ---

export type TalentAffixPosition = 'prefix' | 'suffix'
export type TalentAffixRarity = 'common' | 'rare' | 'epic' | 'legendary'

export type TalentAffixEffect =
  | { type: 'flatStat'; stat: TalentStat; minValue: number; maxValue: number }
  | { type: 'elementDamage'; element: string; minValue: number; maxValue: number }
  | {
      type: 'conditional'
      trigger: string
      effect: { stat: string; minValue: number; maxValue: number }
      threshold?: number
    }
  | {
      type: 'chance'
      description: string
      minValue: number
      maxValue: number
      effect: { stat: string; value: number }
    }
  | { type: 'modifier'; target: string; minValue: number; maxValue: number }

export interface TalentAffix {
  id: string
  name: string
  position: TalentAffixPosition
  rarity: TalentAffixRarity
  description: string
  effects: TalentAffixEffect[]
}

export interface ResolvedAffixEffect {
  type: string
  value: number
  stat?: string
  element?: string
  target?: string
  trigger?: string
  threshold?: number
}

export interface TalentAffixInstance {
  affixId: string
  name: string
  position: TalentAffixPosition
  rarity: TalentAffixRarity
  description: string
  resolvedEffects: ResolvedAffixEffect[]
}
