import type { BuildingType, Building, ResourceCaps } from '../types/sect'
import type { SpecialtyType } from '../types/character'
import { getMarketBuff, getAlchemyBuff, getForgeBuff, getRecruitBuff } from '../systems/economy/BuildingEffects'

export interface BuildingDef {
  type: BuildingType
  name: string
  description: string
  maxLevel: number
  upgradeCost: (level: number) => { spiritStone: number }
  unlockCondition: string
}

export interface BuildingEcologyProfile {
  recruitmentBias: string
  buildBias: string
  specialtyBias: string[]
  techniqueBias: string[]
}

const OBSERVED_BUILDING_LEVELS: Partial<Record<BuildingType, number>> = {}

function clampObservedLevel(level: number): number {
  return Math.max(0, Math.floor(level))
}

export function observeBuildingLevel(type: BuildingType, level: number): void {
  OBSERVED_BUILDING_LEVELS[type] = clampObservedLevel(level)
}

export function getObservedBuildingLevel(type: BuildingType): number {
  return OBSERVED_BUILDING_LEVELS[type] ?? 0
}

export function resetObservedBuildingLevels(): void {
  for (const key of Object.keys(OBSERVED_BUILDING_LEVELS)) {
    delete OBSERVED_BUILDING_LEVELS[key as BuildingType]
  }
}

function makeEcologyProfile(
  recruitmentBias: string,
  buildBias: string,
  specialtyBias: SpecialtyType[],
  techniqueBias: string[]
): BuildingEcologyProfile {
  return { recruitmentBias, buildBias, specialtyBias, techniqueBias }
}

export function getBuildingEcologyProfile(type: BuildingType, level: number): BuildingEcologyProfile | null {
  if (level <= 0) return null

  switch (type) {
    case 'alchemyFurnace':
      return makeEcologyProfile(
        level >= 3 ? '更容易出现丹道、治疗与辅助取向弟子' : '开始偏向炼丹与后勤型弟子',
        '续战、恢复、稳定增益',
        level >= 3 ? ['alchemy', 'herbalism', 'comprehension'] : ['alchemy', 'herbalism'],
        level >= 3 ? ['xuanbing', 'jiuzhuan', 'taishang'] : ['qingxin']
      )
    case 'forge':
      return makeEcologyProfile(
        level >= 3 ? '更容易出现锻造、战斗与爆发取向弟子' : '开始偏向锻造与战斗型弟子',
        '爆发、攻坚、装备协同',
        level >= 3 ? ['forging', 'combat', 'leadership'] : ['forging', 'combat'],
        level >= 3 ? ['lieyan', 'fentian', 'wanjianguizong'] : ['lieyan']
      )
    case 'scriptureHall':
      return makeEcologyProfile(
        level >= 3 ? '更容易出现悟性、领悟与控场取向弟子' : '开始偏向悟性与技能成型弟子',
        '学习、顿悟、技能连携',
        level >= 3 ? ['comprehension', 'leadership', 'fortune'] : ['comprehension', 'leadership'],
        level >= 3 ? ['qingxin', 'jiuzhuan', 'taishang'] : ['qingxin']
      )
    case 'spiritField':
      return makeEcologyProfile(
        level >= 3 ? '更容易出现稳健、续航与资源型弟子' : '开始偏向资源与稳守型弟子',
        '续航、耐久、资源循环',
        level >= 3 ? ['herbalism', 'leadership', 'fortune'] : ['herbalism'],
        level >= 3 ? ['houtu', 'xuanbing'] : ['houtu']
      )
    case 'spiritMine':
      return makeEcologyProfile(
        level >= 3 ? '更容易出现挖掘、体魄与攻守兼备弟子' : '开始偏向矿脉与体修型弟子',
        '攻守均衡、稳定成长',
        level >= 3 ? ['mining', 'combat', 'forging'] : ['mining', 'combat'],
        level >= 3 ? ['bumiejinshen', 'jiuzhuan'] : ['bumiejinshen']
      )
    case 'market':
      return makeEcologyProfile(
        level >= 3 ? '更容易出现机缘、经营与灵活应变弟子' : '开始偏向坊市与机缘型弟子',
        '资源调度、收益转化、临场应变',
        level >= 3 ? ['fortune', 'leadership'] : ['fortune'],
        level >= 3 ? ['jiuzhuan', 'qingxin'] : ['qingxin']
      )
    case 'recruitmentPavilion':
      return makeEcologyProfile(
        level >= 3 ? '招募池更容易出现高质量、低杂质弟子' : '招募效率提升，杂质开始减少',
        '更高基础质量、更多可塑性',
        ['fortune', 'leadership', 'comprehension'],
        level >= 3 ? ['taishang', 'wanjianguizong', 'houtu'] : ['qingxin']
      )
    case 'mainHall':
      return makeEcologyProfile(
        level >= 3 ? '宗门整体更容易诞生均衡型弟子' : '宗门气象开始稳定',
        '全局均衡，少偏科',
        ['leadership', 'fortune'],
        ['qingxin']
      )
    default:
      return null
  }
}

export function getObservedBuildingEcology(type: BuildingType): BuildingEcologyProfile | null {
  const level = getObservedBuildingLevel(type)
  return getBuildingEcologyProfile(type, level)
}

export const BUILDING_DEFS: BuildingDef[] = [
  {
    type: 'mainHall',
    name: '宗门大殿',
    description: '宗门核心建筑',
    maxLevel: 10,
    upgradeCost: (lv) => ({ spiritStone: Math.round(100 * Math.pow(lv + 1, 1.3)) }),
    unlockCondition: '初始',
  },
  {
    type: 'spiritMine',
    name: '灵石矿',
    description: '产出灵石和矿材',
    maxLevel: 10,
    upgradeCost: (lv) => ({ spiritStone: Math.round(100 * Math.pow(lv + 1, 1.3)) }),
    unlockCondition: '初始',
  },
  {
    type: 'spiritField',
    name: '灵田',
    description: '产出灵草和灵材',
    maxLevel: 10,
    upgradeCost: (lv) => ({ spiritStone: Math.round(80 * Math.pow(lv + 1, 1.3)) }),
    unlockCondition: '大殿 Lv1',
  },
  {
    type: 'market',
    name: '坊市',
    description: 'NPC 商店',
    maxLevel: 8,
    upgradeCost: (lv) => ({ spiritStone: Math.round(100 * Math.pow(lv + 1, 1.3)) }),
    unlockCondition: '大殿 Lv1',
  },
  {
    type: 'alchemyFurnace',
    name: '丹炉',
    description: '炼制丹药',
    maxLevel: 8,
    upgradeCost: (lv) => ({ spiritStone: Math.round(150 * Math.pow(lv + 1, 1.3)) }),
    unlockCondition: '大殿 Lv2 + 灵田 Lv2',
  },
  {
    type: 'forge',
    name: '炼器坊',
    description: '锻造和强化装备',
    maxLevel: 8,
    upgradeCost: (lv) => ({ spiritStone: Math.round(150 * Math.pow(lv + 1, 1.3)) }),
    unlockCondition: '大殿 Lv2',
  },
  {
    type: 'scriptureHall',
    name: '藏经阁',
    description: '学习功法',
    maxLevel: 8,
    upgradeCost: (lv) => ({ spiritStone: Math.round(200 * Math.pow(lv + 1, 1.3)) }),
    unlockCondition: '大殿 Lv3',
  },
  {
    type: 'recruitmentPavilion',
    name: '聚仙台',
    description: '招募弟子',
    maxLevel: 6,
    upgradeCost: (lv) => ({ spiritStone: Math.round(300 * Math.pow(lv + 1, 1.3)) }),
    unlockCondition: '大殿 Lv3',
  },
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
  observeBuildingLevel(building.type, building.level)

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
    case 'scriptureHall':
      return '学习功法'
    case 'recruitmentPavilion': {
      const buff = getRecruitBuff(building.level)
      return `招募费用 -${Math.round((1 - buff.costMult) * 100)}%`
    }
    default:
      return ''
  }
}

// ---------------------------------------------------------------------------
// Building Synergies
// ---------------------------------------------------------------------------

export interface Synergy {
  id: string
  name: string
  description: string
  requirements: { building: BuildingType; level: number }[]
  effect: { target: BuildingType; value: number }
}

export const SYNERGIES: Synergy[] = [
  {
    id: 'alchemy_herbalism',
    name: '灵药之道',
    description: '丹炉产出效率 +20%',
    requirements: [
      { building: 'spiritField', level: 3 },
      { building: 'alchemyFurnace', level: 3 },
    ],
    effect: { target: 'alchemyFurnace', value: 0.2 },
  },
  {
    id: 'forging_mining',
    name: '百炼成钢',
    description: '锻造成功率 +15%',
    requirements: [
      { building: 'spiritMine', level: 3 },
      { building: 'forge', level: 3 },
    ],
    effect: { target: 'forge', value: 0.15 },
  },
  {
    id: 'comprehension_recruit',
    name: '以武入道',
    description: '功法领悟概率 +15%',
    requirements: [
      { building: 'scriptureHall', level: 3 },
      { building: 'recruitmentPavilion', level: 2 },
    ],
    effect: { target: 'scriptureHall', value: 0.15 },
  },
  {
    id: 'market_mining',
    name: '开源节流',
    description: '坊市品质上限 +1',
    requirements: [
      { building: 'spiritMine', level: 5 },
      { building: 'market', level: 3 },
    ],
    effect: { target: 'market', value: 1 },
  },
  {
    id: 'alchemy_forging',
    name: '丹器双修',
    description: '丹炉和炼器坊效率各 +25%',
    requirements: [
      { building: 'alchemyFurnace', level: 5 },
      { building: 'forge', level: 5 },
    ],
    effect: { target: 'alchemyFurnace', value: 0.25 },
  },
  {
    id: 'alchemy_forging_forge',
    name: '丹器双修',
    description: '丹炉和炼器坊效率各 +25%',
    requirements: [
      { building: 'alchemyFurnace', level: 5 },
      { building: 'forge', level: 5 },
    ],
    effect: { target: 'forge', value: 0.25 },
  },
]

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
    default:
      return ''
  }
}
