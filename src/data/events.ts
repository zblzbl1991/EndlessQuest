import type { Dungeon } from '../types/adventure'

export const DUNGEONS: Dungeon[] = [
  { id: 'lingCaoValley', name: '灵草谷', totalLayers: 5, eventsPerLayer: 3, unlockRealm: 0, unlockStage: 3 },
  { id: 'biQuanStream', name: '碧泉溪', totalLayers: 6, eventsPerLayer: 3, unlockRealm: 1, unlockStage: 0 },
  { id: 'luoYunCave', name: '落云洞', totalLayers: 8, eventsPerLayer: 3, unlockRealm: 1, unlockStage: 3 },
  { id: 'anYaForest', name: '暗鸦林', totalLayers: 9, eventsPerLayer: 3, unlockRealm: 2, unlockStage: 0 },
  { id: 'bloodDemonAbyss', name: '血魔渊', totalLayers: 10, eventsPerLayer: 4, unlockRealm: 2, unlockStage: 3 },
  { id: 'hanBingCave', name: '寒冰石窟', totalLayers: 11, eventsPerLayer: 4, unlockRealm: 3, unlockStage: 0 },
  { id: 'dragonBoneWasteland', name: '龙骨荒原', totalLayers: 12, eventsPerLayer: 4, unlockRealm: 3, unlockStage: 3 },
  { id: 'shiHunSwamp', name: '噬魂沼泽', totalLayers: 13, eventsPerLayer: 4, unlockRealm: 4, unlockStage: 0 },
  { id: 'nineNetherPurgatory', name: '九幽炼狱', totalLayers: 15, eventsPerLayer: 5, unlockRealm: 4, unlockStage: 3 },
  { id: 'wanYaoPalace', name: '万妖殿', totalLayers: 17, eventsPerLayer: 5, unlockRealm: 5, unlockStage: 0 },
  {
    id: 'heavenlyTribulationRealm',
    name: '天劫秘境',
    totalLayers: 20,
    eventsPerLayer: 5,
    unlockRealm: 5,
    unlockStage: 3,
  },
]
