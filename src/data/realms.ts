import type { RealmStage } from '../types/character'

export interface RealmDef {
  name: string
  stages: string[]
  cultivationCosts: number[]
  breakthroughExtra: string | null
  unlockContent: string
  tribulationPower?: number
  tribulationStages?: number[]
  statMultiplier: number
}

export const REALMS: RealmDef[] = [
  {
    name: '炼气期',
    stages: ['初期', '中期', '后期', '圆满'],
    cultivationCosts: [100, 300, 600, 1000],
    breakthroughExtra: null,
    unlockContent: '基础功法、灵品装备掉落',
    statMultiplier: 1,
  },
  {
    name: '筑基期',
    stages: ['初期', '中期', '后期', '圆满'],
    cultivationCosts: [2000, 4000, 7000, 11000],
    breakthroughExtra: '需消耗大量灵石',
    unlockContent: '秘境解锁（落云洞）',
    statMultiplier: 1.8,
  },
  {
    name: '金丹期',
    stages: ['初期', '中期', '后期', '圆满'],
    cultivationCosts: [18000, 28000, 40000, 55000],
    breakthroughExtra: '金丹劫 + 灵石',
    unlockContent: '灵宠系统',
    tribulationPower: 0.8,
    statMultiplier: 1.8,
  },
  {
    name: '元婴期',
    stages: ['初期', '中期', '后期', '圆满'],
    cultivationCosts: [75000, 100000, 130000, 170000],
    breakthroughExtra: '元婴劫 + 灵石',
    unlockContent: '弟子系统（经营线）',
    tribulationPower: 1.0,
    statMultiplier: 1.8,
  },
  {
    name: '化神期',
    stages: ['初期', '中期', '后期', '圆满'],
    cultivationCosts: [220000, 280000, 350000, 450000],
    breakthroughExtra: '天劫 + 灵石',
    unlockContent: '高级功法、飞剑',
    tribulationStages: [1.0, 1.2, 1.5],
    statMultiplier: 1.8,
  },
  {
    name: '渡劫飞升',
    stages: ['飞升'],
    cultivationCosts: [600000],
    breakthroughExtra: '全建筑满级',
    unlockContent: '游戏通关',
    statMultiplier: 1.8,
  },
]

export const STAGE_NAMES: RealmStage[] = [0, 1, 2, 3] as RealmStage[]

export function getRealmName(realmIndex: number, stage: RealmStage): string {
  const realm = REALMS[realmIndex]
  if (!realm) return '未知'
  const stageName = realm.stages[stage] ?? ''
  return `${realm.name} ${stageName}`
}

export function getCultivationNeeded(realmIndex: number, stage: number): number {
  return REALMS[realmIndex]?.cultivationCosts[stage] ?? Infinity
}

/**
 * Breakthrough costs for major realm transitions.
 * Key = target realm index (1-4). Requires spiritStone only.
 */
export const BREAKTHROUGH_COSTS: Record<number, { spiritStone: number }> = {
  1: { spiritStone: 3000 },
  2: { spiritStone: 15000 },
  3: { spiritStone: 80000 },
  4: { spiritStone: 350000 },
}
