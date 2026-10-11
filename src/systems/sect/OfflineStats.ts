/**
 * 离线统计增量（V2.2 map 工单 01）：击杀 / 装备获取与分解 / 秘境探索
 * 的唯一累加漏斗。adventureStore（在线结算与离线 tickAllIdle）、itemSlice
 * （手动出售）、tickSlice（自动出售凡品清扫）全部经 bumpOfflineStats 入账，
 * 保证两条路径（在线 run / 离线 idle）统计口径一致。
 */
import type { OfflineAccumulator } from '../../types'

export interface OfflineStatDelta {
  kills?: number
  equipmentGained?: number
  equipmentSold?: number
  dungeonRuns?: number
  dungeonFloorsCleared?: number
}

export function emptyOfflineAccumulator(): OfflineAccumulator {
  return {
    resourcesGained: { spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0 },
    breakthroughs: [],
    itemsCrafted: [],
    taxIncome: 0,
    lowSpiritSeconds: 0,
    kills: 0,
    equipmentGained: 0,
    equipmentSold: 0,
    dungeonRuns: 0,
    dungeonFloorsCleared: 0,
  }
}

/** 把一批统计增量并入累积器（负增量视为 0——统计只增不减）。 */
export function bumpOfflineAccumulator(acc: OfflineAccumulator, delta: OfflineStatDelta): OfflineAccumulator {
  const add = (v: number | undefined) => (v && v > 0 ? Math.floor(v) : 0)
  return {
    ...acc,
    kills: (acc.kills ?? 0) + add(delta.kills),
    equipmentGained: (acc.equipmentGained ?? 0) + add(delta.equipmentGained),
    equipmentSold: (acc.equipmentSold ?? 0) + add(delta.equipmentSold),
    dungeonRuns: (acc.dungeonRuns ?? 0) + add(delta.dungeonRuns),
    dungeonFloorsCleared: (acc.dungeonFloorsCleared ?? 0) + add(delta.dungeonFloorsCleared),
  }
}

/** 装备物品计数（装备获取/分解统计的口径：按件不按叠层类型）。 */
export function countEquipmentItems(items: { type: string; quantity?: number }[]): number {
  return items.reduce((sum, item) => (item.type === 'equipment' ? sum + (item.quantity ?? 1) : sum), 0)
}
