import type { BuildingType, Building, ResourceCaps } from '../types/sect'
import { getMarketBuff, getAlchemyBuff, getForgeBuff, getScriptureBuff, getRecruitBuff, getTrainingBuff } from '../systems/economy/BuildingEffects'

export interface BuildingDef {
  type: BuildingType
  name: string
  description: string
  maxLevel: number
  upgradeCost: (level: number) => { spiritStone: number }
  unlockCondition: string
}

export const BUILDING_DEFS: BuildingDef[] = [
  { type: 'mainHall', name: '宗门大殿', description: '宗门核心建筑', maxLevel: 10, upgradeCost: (lv) => ({ spiritStone: Math.round(100 * Math.pow(lv + 1, 1.3)) }), unlockCondition: '初始' },
  { type: 'spiritMine', name: '灵石矿', description: '产出灵石和矿材', maxLevel: 10, upgradeCost: (lv) => ({ spiritStone: Math.round(100 * Math.pow(lv + 1, 1.3)) }), unlockCondition: '初始' },
  { type: 'spiritField', name: '灵田', description: '产出灵草和灵材', maxLevel: 10, upgradeCost: (lv) => ({ spiritStone: Math.round(80 * Math.pow(lv + 1, 1.3)) }), unlockCondition: '大殿 Lv1' },
  { type: 'market', name: '坊市', description: 'NPC 商店', maxLevel: 8, upgradeCost: (lv) => ({ spiritStone: Math.round(100 * Math.pow(lv + 1, 1.3)) }), unlockCondition: '大殿 Lv1' },
  { type: 'alchemyFurnace', name: '丹炉', description: '炼制丹药', maxLevel: 8, upgradeCost: (lv) => ({ spiritStone: Math.round(150 * Math.pow(lv + 1, 1.3)) }), unlockCondition: '大殿 Lv2 + 灵田 Lv2' },
  { type: 'forge', name: '炼器坊', description: '锻造和强化装备', maxLevel: 8, upgradeCost: (lv) => ({ spiritStone: Math.round(150 * Math.pow(lv + 1, 1.3)) }), unlockCondition: '大殿 Lv2' },
  { type: 'scriptureHall', name: '藏经阁', description: '学习功法', maxLevel: 8, upgradeCost: (lv) => ({ spiritStone: Math.round(200 * Math.pow(lv + 1, 1.3)) }), unlockCondition: '大殿 Lv3' },
  { type: 'recruitmentPavilion', name: '聚仙台', description: '招募弟子', maxLevel: 6, upgradeCost: (lv) => ({ spiritStone: Math.round(300 * Math.pow(lv + 1, 1.3)) }), unlockCondition: '大殿 Lv3' },
  { type: 'trainingHall', name: '传功殿', description: '弟子修炼', maxLevel: 6, upgradeCost: (lv) => ({ spiritStone: Math.round(250 * Math.pow(lv + 1, 1.3)) }), unlockCondition: '大殿 Lv4' },
]

export function getBuildingDef(type: BuildingType): BuildingDef | undefined {
  return BUILDING_DEFS.find((b) => b.type === type)
}

/**
 * Spirit field production rate (spirit energy per second).
 * Formula: 3 + (level - 1) * 2
 *
 * Level 1: 3/s, Level 2: 5/s, Level 3: 7/s,
 * Level 5: 11/s, Level 10: 21/s
 */
export function getSpiritFieldRate(level: number): number {
  if (level < 1) return 0
  return 3 + (level - 1) * 2
}

export function getSpiritMineRate(level: number): number {
  if (level < 1) return 0
  return 0.5 + (level - 1) * 0.5
}

export function getSpiritMineOreRate(level: number): number {
  if (level < 1) return 0
  return 0.05 * level
}

/**
 * Calculate resource storage caps based on spirit field and mine levels.
 * These are runtime-calculated limits, not persisted.
 */
export function calcResourceCaps(spiritFieldLevel: number, spiritMineLevel: number): ResourceCaps {
  return {
    spiritEnergy: 500 + spiritFieldLevel * 300,
    herb: 200 + spiritFieldLevel * 100,
    ore: 200 + spiritMineLevel * 100,
  }
}

// ---------------------------------------------------------------------------
// Building effect text for UI display
// ---------------------------------------------------------------------------

export function getBuildingEffectText(building: Building): string {
  if (!building.unlocked || building.level === 0) return ''

  switch (building.type) {
    case 'mainHall':
      return `宗门等级 ${Math.ceil(building.level / 2)}`
    case 'spiritField':
      return `灵气 +${getSpiritFieldRate(building.level)}/s · 灵草 +${(0.1 * building.level).toFixed(1)}/s`
    case 'spiritMine':
      return `灵石 +${getSpiritMineRate(building.level).toFixed(1)}/s · 矿材 +${getSpiritMineOreRate(building.level).toFixed(2)}/s`
    case 'market': {
      const buff = getMarketBuff(building.level)
      return `刷新 ${buff.dailyRefreshCount}次/日`
    }
    case 'alchemyFurnace': {
      const buff = getAlchemyBuff(building.level)
      return `丹药效果 +${Math.round((buff.potionEffectMult - 1) * 100)}%`
    }
    case 'forge': {
      const buff = getForgeBuff(building.level)
      return `强化成功率 +${Math.round(buff.successBonus * 100)}% · 消耗 -${Math.round(buff.costReduction * 100)}%`
    }
    case 'scriptureHall': {
      const buff = getScriptureBuff(building.level)
      return `领悟速度 +${Math.round((buff.comprehensionMult - 1) * 100)}%`
    }
    case 'recruitmentPavilion': {
      const buff = getRecruitBuff(building.level)
      return `招募费用 -${Math.round((1 - buff.costMult) * 100)}%`
    }
    case 'trainingHall': {
      const buff = getTrainingBuff(building.level)
      return `修炼速度 +${Math.round((buff.speedMult - 1) * 100)}%`
    }
    default:
      return ''
  }
}

export function getBuildingUnlockText(building: Building): string {
  if (building.unlocked) return ''
  switch (building.type) {
    case 'market':
      return '解锁后：商店刷新+1'
    case 'spiritMine':
      return '解锁后：灵石+0.5/s · 矿材+0.05/s'
    case 'alchemyFurnace':
      return '解锁后：丹药效果+20%'
    case 'forge':
      return '解锁后：强化成功率+10%'
    case 'scriptureHall':
      return '解锁后：领悟速度+15%'
    case 'recruitmentPavilion':
      return '解锁后：招募费用-10%'
    case 'trainingHall':
      return '解锁后：修炼速度+10%'
    default:
      return ''
  }
}
