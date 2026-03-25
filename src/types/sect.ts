import type { Character } from './character'
import type { AnyItem } from './item'
import type { Pet } from '../systems/pet/PetSystem'

export type BuildingType =
  | 'mainHall' | 'spiritField' | 'spiritMine' | 'market' | 'alchemyFurnace'
  | 'forge' | 'scriptureHall' | 'recruitmentPavilion' | 'trainingHall'

export type ResourceType = 'spiritStone' | 'spiritEnergy' | 'herb' | 'ore'

export interface Resources {
  spiritStone: number
  spiritEnergy: number
  herb: number
  ore: number
}

export interface Building {
  type: BuildingType
  level: number
  unlocked: boolean
}

export interface Sect {
  name: string
  level: number
  resources: Resources
  buildings: Building[]
  characters: Character[]
  vault: AnyItem[]
  maxVaultSlots: number
  pets: Pet[]
  totalAdventureRuns: number
  totalBreakthroughs: number
  lastTransmissionTime: number
}
