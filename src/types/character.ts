import type { ItemStack } from './item'
import type { Talent, TalentAffixInstance } from './talent'
import type { FateGridId } from './destiny'
import type { Element } from './skill'

export type CultivationPath = 'none' | 'sword' | 'body' | 'alchemy' | 'beast' | 'formation' | 'void'

export type CharacterTitle = 'disciple' | 'seniorDisciple' | 'master' | 'elder'

export type CharacterQuality = 'common' | 'spirit' | 'immortal' | 'divine' | 'chaos'

export type CharacterStatus = 'idle' | 'adventuring' | 'patrolling' | 'resting' | 'injured' | 'training' | 'recovering'

export type CharacterManagementTier = 'core' | 'main' | 'reserve' | 'support'

export type CharacterAutomationRole = 'cultivation' | 'expedition' | 'production' | 'study' | 'recovery'

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

export interface GrowthMultipliers {
  hp: number
  atk: number
  def: number
  spd: number
  crit: number
  critDmg: number
}

export interface ElementAffinity {
  primary: Element
  secondary?: Element // Not primary, not neutral
}

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
  level: number
  xp: number
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
  managementTier: CharacterManagementTier
  automationRole: CharacterAutomationRole
  cultivationPath: CultivationPath
  investedSpiritStone: number
  techniqueComprehension: Record<string, number>
  fateGrid?: FateGridId
  // --- Deep randomization fields ---
  elementAffinity: ElementAffinity
  growthMultipliers: GrowthMultipliers
  prefix?: TalentAffixInstance
  suffix?: TalentAffixInstance
}
