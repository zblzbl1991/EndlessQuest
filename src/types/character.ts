import type { AnyItem } from './item'

export type CharacterTitle = 'disciple' | 'seniorDisciple' | 'master' | 'elder'

export type CharacterQuality = 'common' | 'spirit' | 'immortal' | 'divine' | 'chaos'

export type CharacterStatus = 'idle' | 'cultivating' | 'adventuring' | 'injured' | 'training'

export type RealmStage = 0 | 1 | 2 | 3

export interface BaseStats {
  hp: number
  atk: number
  def: number
  spd: number
  crit: number
  critDmg: number
}

export interface CultivationStats {
  spiritPower: number
  maxSpiritPower: number
  comprehension: number
  spiritualRoot: number
  fortune: number
}

export interface Character {
  id: string
  name: string
  title: CharacterTitle
  quality: CharacterQuality
  realm: number
  realmStage: RealmStage
  cultivation: number
  baseStats: BaseStats
  cultivationStats: CultivationStats
  currentTechnique: string | null
  techniqueComprehension: number
  learnedTechniques: string[]
  equippedGear: (string | null)[]
  equippedSkills: (string | null)[]
  backpack: AnyItem[]
  maxBackpackSlots: number
  petIds: string[]
  status: CharacterStatus
  injuryTimer: number
  createdAt: number
  totalCultivation: number
}
