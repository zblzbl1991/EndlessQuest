// ---------------------------------------------------------------------------
// Random Event Types
// ---------------------------------------------------------------------------

export type RandomEventRarity = 'common' | 'uncommon' | 'rare' | 'legendary'

export type RandomEventCategory =
  | 'fortunate_encounter'
  | 'disciple_mutation'
  | 'disaster'
  | 'sect_event'
  | 'natural_phenomenon'

export type RandomEventEffectType = 'resource' | 'character_exp' | 'character_status' | 'technique_insight'

export interface RandomEventEffect {
  type: RandomEventEffectType
  target?: string
  value: number
}

export interface RandomEventDef {
  id: string
  name: string
  description: string
  rarity: RandomEventRarity
  category: RandomEventCategory
  effects: RandomEventEffect[]
}

export interface RandomEventResult {
  triggered: boolean
  event: RandomEventDef | null
  message: string
  effects: RandomEventEffect[]
}
