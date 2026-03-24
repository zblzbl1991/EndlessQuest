import type { BuildingType } from '../types/sect'

export interface BuildingDef {
  type: BuildingType
  name: string
  description: string
  maxLevel: number
  upgradeCost: (level: number) => { spiritStone: number }
  unlockCondition: string
}

export const BUILDING_DEFS: BuildingDef[] = [
  { type: 'mainHall', name: '宗门大殿', description: '宗门核心建筑', maxLevel: 10, upgradeCost: (lv) => ({ spiritStone: 100 * lv }), unlockCondition: '初始' },
  { type: 'spiritField', name: '灵田', description: '产出灵草和灵材', maxLevel: 10, upgradeCost: (lv) => ({ spiritStone: 80 * lv }), unlockCondition: '大殿 Lv1' },
  { type: 'market', name: '坊市', description: 'NPC 商店', maxLevel: 8, upgradeCost: (lv) => ({ spiritStone: 100 * lv }), unlockCondition: '大殿 Lv1' },
  { type: 'alchemyFurnace', name: '丹炉', description: '炼制丹药', maxLevel: 8, upgradeCost: (lv) => ({ spiritStone: 150 * lv }), unlockCondition: '大殿 Lv2 + 灵田 Lv2' },
  { type: 'forge', name: '炼器坊', description: '锻造和强化装备', maxLevel: 8, upgradeCost: (lv) => ({ spiritStone: 150 * lv }), unlockCondition: '大殿 Lv2' },
  { type: 'scriptureHall', name: '藏经阁', description: '学习功法', maxLevel: 8, upgradeCost: (lv) => ({ spiritStone: 200 * lv }), unlockCondition: '大殿 Lv3' },
  { type: 'recruitmentPavilion', name: '聚仙台', description: '招募弟子', maxLevel: 6, upgradeCost: (lv) => ({ spiritStone: 300 * lv }), unlockCondition: '大殿 Lv3' },
  { type: 'trainingHall', name: '传功殿', description: '弟子修炼', maxLevel: 6, upgradeCost: (lv) => ({ spiritStone: 250 * lv }), unlockCondition: '大殿 Lv4' },
]

export function getBuildingDef(type: BuildingType): BuildingDef | undefined {
  return BUILDING_DEFS.find((b) => b.type === type)
}

/**
 * Spirit field production rate (spirit energy per second).
 * Formula: 1 + (level - 1) * 3  (equivalently: level * 1 + max(0, level - 1) * 3 with a base adjustment)
 * Which simplifies to: level * 1 + (level - 1) * 3 = 4*level - 3 for level >= 1
 *
 * Level 1: 1/s, Level 2: 4/s, Level 3: 7/s,
 * Level 5: 13/s, Level 10: 28/s
 */
export function getSpiritFieldRate(level: number): number {
  if (level < 1) return 0
  return 1 + (level - 1) * 3
}
