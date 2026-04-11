import type { Dungeon } from '../types/adventure'
import type { Technique } from '../types/technique'
import { DUNGEONS } from './events'
import { getTechniqueById } from './techniquesTable'

function fallbackDungeon(id: string): Dungeon {
  return {
    id,
    name: id,
    totalLayers: 0,
    eventsPerLayer: 0,
    unlockRealm: 0,
    unlockStage: 0,
  }
}

export function getLegacyTechniqueUnlocks(ids: string[]): Technique[] {
  return ids.map((id) => getTechniqueById(id)).filter((technique): technique is Technique => Boolean(technique))
}

export function getLegacyDungeonUnlocks(ids: string[]): Dungeon[] {
  return ids.map((id) => DUNGEONS.find((dungeon) => dungeon.id === id) ?? fallbackDungeon(id))
}

export function getLegacyTechniqueName(id: string): string {
  return getTechniqueById(id)?.name ?? id
}

export function getLegacyDungeonName(id: string): string {
  return DUNGEONS.find((dungeon) => dungeon.id === id)?.name ?? id
}
