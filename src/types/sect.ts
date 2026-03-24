export type BuildingType =
  | 'mainHall' | 'spiritField' | 'market' | 'alchemyFurnace'
  | 'forge' | 'scriptureHall' | 'recruitmentPavilion' | 'trainingHall'

export type DiscipleQuality = 'common' | 'spirit' | 'immortal' | 'divine'

export type ResourceType = 'spiritStone' | 'spiritEnergy' | 'herb' | 'ore' | 'fairyJade' | 'scrollFragment' | 'heavenlyTreasure' | 'beastSoul'

export interface Resources {
  spiritStone: number
  spiritEnergy: number
  herb: number
  ore: number
  fairyJade: number
  scrollFragment: number
  heavenlyTreasure: number
  beastSoul: number
}

export interface Building {
  type: BuildingType
  level: number
  unlocked: boolean
}

export interface Disciple {
  id: string
  name: string
  quality: DiscipleQuality
  level: number
  talent: number
  loyalty: number
  hp: number
  atk: number
  def: number
  spd: number
  equippedTechniques: (string | null)[]
  equippedSkills: (string | null)[]
  status: 'active' | 'wounded' | 'dispatched'
  dispatchEndTime: number | null
  highestQualityOwned: DiscipleQuality
}

export interface SectState {
  buildings: Building[]
  disciples: Disciple[]
  resources: Resources
  discipleMaxOwned: Record<DiscipleQuality, number>
}
