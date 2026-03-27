export interface MissionReward {
  type: 'spiritStone' | 'herb' | 'ore' | 'consumable'
  amount: number
  recipeId?: string
}

export interface DispatchMission {
  id: string
  name: string
  description: string
  duration: number
  rewards: MissionReward[]
  minRealm: number
}

export const DISPATCH_MISSIONS: DispatchMission[] = [
  {
    id: 'gather_herbs',
    name: '采集灵药',
    description: '前往山野采集灵药',
    duration: 300,
    rewards: [{ type: 'herb', amount: 80 }],
    minRealm: 0,
  },
  {
    id: 'mine_ores',
    name: '探矿',
    description: '深入矿脉开采矿石',
    duration: 300,
    rewards: [{ type: 'ore', amount: 50 }],
    minRealm: 0,
  },
  {
    id: 'visit_market',
    name: '访问坊市',
    description: '前往坊市寻找丹药',
    duration: 180,
    rewards: [{ type: 'spiritStone', amount: 200 }],
    minRealm: 1,
  },
  {
    id: 'seek_master',
    name: '寻访高人',
    description: '外出寻访修仙前辈',
    duration: 600,
    rewards: [{ type: 'consumable', amount: 1, recipeId: 'spirit_potion' }],
    minRealm: 2,
  },
  {
    id: 'hunt_beasts',
    name: '猎杀妖兽',
    description: '清理附近妖兽获取灵石',
    duration: 480,
    rewards: [{ type: 'spiritStone', amount: 400 }],
    minRealm: 1,
  },
]

export function getAvailableMissions(characterRealm: number): DispatchMission[] {
  return DISPATCH_MISSIONS.filter(m => m.minRealm <= characterRealm)
}
