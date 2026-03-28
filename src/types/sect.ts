import type { Character } from './character'
import type { ItemStack } from './item'
import type { Pet } from '../systems/pet/PetSystem'

export type BuildingType =
  | 'mainHall' | 'spiritField' | 'spiritMine' | 'market' | 'alchemyFurnace'
  | 'forge' | 'scriptureHall' | 'recruitmentPavilion'

export type ResourceType = 'spiritStone' | 'spiritEnergy' | 'herb' | 'ore'

export interface Resources {
  spiritStone: number
  spiritEnergy: number
  herb: number
  ore: number
}

/** 自动生产队列状态（仅加工层建筑使用） */
export interface ProductionQueue {
  recipeId: string | null  // 当前生产配方 ID，null 表示空闲
  progress: number         // 当前累积进度（秒）
}

/** 资源仓库上限（运行时计算，不持久化） */
export interface ResourceCaps {
  spiritEnergy: number
  herb: number
  ore: number
}

export interface Building {
  type: BuildingType
  level: number
  unlocked: boolean
  productionQueue: ProductionQueue
}

export interface Sect {
  name: string
  level: number
  resources: Resources
  buildings: Building[]
  characters: Character[]
  vault: ItemStack[]
  maxVaultSlots: number
  pets: Pet[]
  totalAdventureRuns: number
  totalBreakthroughs: number
  lastTransmissionTime: number
  techniqueCodex: string[]
  activeRoute: import('../data/sectRoutes').SectRouteId | null
}
