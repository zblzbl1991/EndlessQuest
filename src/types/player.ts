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

export interface Player {
  id: string
  name: string
  realm: number
  realmStage: RealmStage
  cultivation: number
  baseStats: BaseStats
  cultivationStats: CultivationStats
  equippedTechniques: (string | null)[]
  equippedSkills: (string | null)[]
  equippedGear: (string | null)[]
  partyPets: (string | null)[]
  partyDisciple: string | null
}
