import type { Dungeon } from '../types/adventure'

export const DUNGEONS: Dungeon[] = [
  { id: 'lingCaoValley', name: '灵草谷', totalLayers: 5, eventsPerLayer: 3, unlockRealm: 0, unlockStage: 3, lootTable: [] },
  { id: 'luoYunCave', name: '落云洞', totalLayers: 8, eventsPerLayer: 3, unlockRealm: 1, unlockStage: 3, lootTable: [] },
  { id: 'bloodDemonAbyss', name: '血魔渊', totalLayers: 10, eventsPerLayer: 4, unlockRealm: 2, unlockStage: 3, lootTable: [] },
  { id: 'dragonBoneWasteland', name: '龙骨荒原', totalLayers: 12, eventsPerLayer: 4, unlockRealm: 3, unlockStage: 3, lootTable: [] },
  { id: 'nineNetherPurgatory', name: '九幽炼狱', totalLayers: 15, eventsPerLayer: 5, unlockRealm: 4, unlockStage: 3, lootTable: [] },
  { id: 'heavenlyTribulationRealm', name: '天劫秘境', totalLayers: 20, eventsPerLayer: 5, unlockRealm: 5, unlockStage: 3, lootTable: [] },
]
