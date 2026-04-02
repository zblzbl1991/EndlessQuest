import type { ItemStack } from './item'
import type { Talent } from './talent'

export type CultivationPath = 'none' | 'sword' | 'body' | 'alchemy' | 'beast' | 'formation' | 'void'
export type FateTag = 'tribulationScar' | 'heartDevilSeed' | 'suddenInsight' | 'stableDaoHeart'

export type CharacterTitle = 'disciple' | 'seniorDisciple' | 'master' | 'elder'

export type CharacterQuality = 'common' | 'spirit' | 'immortal' | 'divine' | 'chaos'

export type CharacterStatus = 'idle' | 'adventuring' | 'patrolling' | 'resting' | 'injured' | 'training' | 'recovering'

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

export type FateTagId = 'tribulation-scar' | 'heart-devil' | 'sudden-insight' | 'stable-dao-heart'

export type SpecialtyType =
  | 'alchemy'
  | 'forging'
  | 'mining'
  | 'herbalism'
  | 'comprehension'
  | 'combat'
  | 'fortune'
  | 'leadership'

export interface Specialty {
  type: SpecialtyType
  level: 1 | 2 | 3
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
  learnedTechniques: string[]
  equippedGear: (string | null)[]
  equippedSkills: (string | null)[]
  backpack: ItemStack[]
  maxBackpackSlots: number
  petIds: string[]
  talents: Talent[]
  status: CharacterStatus
  injuryTimer: number
  recoveryDaysRemaining?: number
  createdAt: number
  totalCultivation: number
  specialties: Specialty[]
  assignedBuilding: string | null
  cultivationPath: CultivationPath
  fateTags: FateTag[]
  investedSpiritStone: number
}
