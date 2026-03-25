export type TalentId = string

export type TalentStat =
  | 'spiritualRoot' | 'comprehension' | 'fortune'
  | 'hp' | 'atk' | 'def' | 'spd' | 'crit' | 'critDmg'
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
