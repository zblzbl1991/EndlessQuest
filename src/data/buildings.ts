import type { SpecialtyType } from '../types/character'
import type { Building, BuildingType, ResourceCaps } from '../types/sect'
import { getAlchemyBuff, getForgeBuff, getMarketBuff, getRecruitBuff } from '../systems/economy/BuildingEffects'
import { getTechniqueCodexCapacity } from '../systems/technique/TechniqueSystem'

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
        level >= 3
          ? 'Attracts pill, support, and recovery-oriented disciples.'
          : 'Leans toward alchemy and logistics-oriented disciples.',
        'Sustain, recovery, and stable growth.',
        level >= 3 ? ['alchemy', 'herbalism', 'comprehension'] : ['alchemy', 'herbalism'],
        level >= 3 ? ['xuanbing', 'jiuzhuan', 'taishang'] : ['qingxin']
      )
    case 'forge':
      return makeEcologyProfile(
        level >= 3
          ? 'Attracts forging, battle, and burst-oriented disciples.'
          : 'Leans toward forging and battle-oriented disciples.',
        'Burst, armor breaking, and equipment synergy.',
        level >= 3 ? ['forging', 'combat', 'leadership'] : ['forging', 'combat'],
        level >= 3 ? ['lieyan', 'fentian', 'wanjianguizong'] : ['lieyan']
      )
    case 'scriptureHall':
      return makeEcologyProfile(
        level >= 3
          ? 'Attracts insight-focused disciples with stable dao hearts.'
          : 'Favors comprehension and study-oriented disciples.',
        'Expands codex depth, insight, and manual retention.',
        level >= 3 ? ['comprehension', 'leadership', 'fortune'] : ['comprehension', 'leadership'],
        level >= 3 ? ['qingxin', 'jiuzhuan', 'taishang'] : ['qingxin']
      )
    case 'spiritField':
      return makeEcologyProfile(
        level >= 3
          ? 'Attracts steady, resource, and sustain-oriented disciples.'
          : 'Leans toward resource and defense-oriented disciples.',
        'Long fights, durability, and resource loops.',
        level >= 3 ? ['herbalism', 'leadership', 'fortune'] : ['herbalism'],
        level >= 3 ? ['houtu', 'xuanbing'] : ['houtu']
      )
    case 'spiritMine':
      return makeEcologyProfile(
        level >= 3
          ? 'Attracts miners with body cultivation and durable frontline traits.'
          : 'Leans toward mining and body-oriented disciples.',
        'Balanced offense and defense with stable development.',
        level >= 3 ? ['mining', 'combat', 'forging'] : ['mining', 'combat'],
        level >= 3 ? ['bumiejinshen', 'jiuzhuan'] : ['bumiejinshen']
      )
    case 'market':
      return makeEcologyProfile(
        level >= 3
          ? 'Attracts opportunistic and adaptable disciples.'
          : 'Leans toward trade and luck-oriented disciples.',
        'Resource arbitrage, conversion, and flexibility.',
        level >= 3 ? ['fortune', 'leadership'] : ['fortune'],
        level >= 3 ? ['jiuzhuan', 'qingxin'] : ['qingxin']
      )
    case 'recruitmentPavilion':
      return makeEcologyProfile(
        level >= 3
          ? 'Recruit pool trends toward higher-quality disciples with fewer dead rolls.'
          : 'Improves recruitment efficiency and baseline quality.',
        'Higher talent floor and more flexible growth.',
        ['fortune', 'leadership', 'comprehension'],
        level >= 3 ? ['taishang', 'wanjianguizong', 'houtu'] : ['qingxin']
      )
    case 'mainHall':
      return makeEcologyProfile(
        level >= 3 ? 'The sect atmosphere favors balanced disciples.' : 'The sect atmosphere becomes more stable.',
        'Global balance with fewer extremes.',
        ['leadership', 'fortune'],
        ['qingxin']
      )
    default:
      return null
  }
}

export function getObservedBuildingEcology(type: BuildingType): BuildingEcologyProfile | null {
  return getBuildingEcologyProfile(type, getObservedBuildingLevel(type))
}

export const BUILDING_DEFS: BuildingDef[] = [
  {
    type: 'mainHall',
    name: '大殿',
    description: '宗门中枢，统摄诸殿运转。',
    maxLevel: 10,
    upgradeCost: (level) => ({ spiritStone: Math.round(100 * Math.pow(level + 1, 1.3)) }),
    unlockCondition: '初始',
  },
  {
    type: 'spiritMine',
    name: '灵石矿',
    description: '产出灵石与矿材，支撑宗门营造。',
    maxLevel: 10,
    upgradeCost: (level) => ({ spiritStone: Math.round(100 * Math.pow(level + 1, 1.3)) }),
    unlockCondition: '初始',
  },
  {
    type: 'spiritField',
    name: '灵田',
    description: '产出灵气与灵草，维系丹药与修行。',
    maxLevel: 10,
    upgradeCost: (level) => ({ spiritStone: Math.round(80 * Math.pow(level + 1, 1.3)) }),
    unlockCondition: '大殿 Lv1',
  },
  {
    type: 'market',
    name: '坊市',
    description: '往来商旅汇聚，可换购宗门所需。',
    maxLevel: 8,
    upgradeCost: (level) => ({ spiritStone: Math.round(100 * Math.pow(level + 1, 1.3)) }),
    unlockCondition: '大殿 Lv1',
  },
  {
    type: 'alchemyFurnace',
    name: '丹炉',
    description: '炼制丹药与灵液，补足修行与战备。',
    maxLevel: 8,
    upgradeCost: (level) => ({ spiritStone: Math.round(150 * Math.pow(level + 1, 1.3)) }),
    unlockCondition: '大殿 Lv2 + 灵田 Lv2',
  },
  {
    type: 'forge',
    name: '锻器坊',
    description: '锻造并精炼器物，提升弟子战力。',
    maxLevel: 8,
    upgradeCost: (level) => ({ spiritStone: Math.round(150 * Math.pow(level + 1, 1.3)) }),
    unlockCondition: '大殿 Lv2',
  },
  {
    type: 'scriptureHall',
    name: '藏经阁',
    description: '扩充藏经容量，沉淀宗门传承。',
    maxLevel: 8,
    upgradeCost: (level) => ({ spiritStone: Math.round(200 * Math.pow(level + 1, 1.3)) }),
    unlockCondition: '大殿 Lv3',
  },
  {
    type: 'recruitmentPavilion',
    name: '聚仙台',
    description: '广纳有缘之人，补充门中弟子。',
    maxLevel: 6,
    upgradeCost: (level) => ({ spiritStone: Math.round(300 * Math.pow(level + 1, 1.3)) }),
    unlockCondition: '大殿 Lv3',
  },
]

export function getBuildingDef(type: BuildingType): BuildingDef | undefined {
  return BUILDING_DEFS.find((building) => building.type === type)
}

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

export function calcResourceCaps(spiritFieldLevel: number, spiritMineLevel: number): ResourceCaps {
  return {
    spiritEnergy: 500 + spiritFieldLevel * 300,
    herb: 200 + spiritFieldLevel * 100,
    ore: 200 + spiritMineLevel * 100,
  }
}

export function getBuildingEffectText(building: Building): string {
  if (!building.unlocked || building.level === 0) return ''
  observeBuildingLevel(building.type, building.level)

  switch (building.type) {
    case 'mainHall':
      return `宗门位阶 ${building.level} | 弟子上限 ${5 + building.level * 5}`
    case 'spiritField':
      return `灵气 +${getSpiritFieldRate(building.level)}/秒 | 灵草 +${(0.1 * building.level).toFixed(1)}/秒`
    case 'spiritMine':
      return `灵石 +${getSpiritMineRate(building.level).toFixed(1)}/秒 | 矿材 +${getSpiritMineOreRate(building.level).toFixed(2)}/秒`
    case 'market': {
      const buff = getMarketBuff(building.level)
      return `每日刷新 ${buff.dailyRefreshCount} 次`
    }
    case 'alchemyFurnace': {
      const buff = getAlchemyBuff(building.level)
      return `丹药效力 +${Math.round((buff.potionEffectMult - 1) * 100)}%`
    }
    case 'forge': {
      const buff = getForgeBuff(building.level)
      return `锻造成功 +${Math.round(buff.successBonus * 100)}% | 消耗 -${Math.round(buff.costReduction * 100)}%`
    }
    case 'scriptureHall':
      return `藏经容量 ${getTechniqueCodexCapacity(building.level)}`
    case 'recruitmentPavilion': {
      const buff = getRecruitBuff(building.level)
      return `招募消耗 -${Math.round((1 - buff.costMult) * 100)}%`
    }
    default:
      return ''
  }
}

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
    name: '药脉流转',
    description: '丹炉产出效率 +20%',
    requirements: [
      { building: 'spiritField', level: 3 },
      { building: 'alchemyFurnace', level: 3 },
    ],
    effect: { target: 'alchemyFurnace', value: 0.2 },
  },
  {
    id: 'forging_mining',
    name: '矿火淬炼',
    description: '锻造成功率 +15%',
    requirements: [
      { building: 'spiritMine', level: 3 },
      { building: 'forge', level: 3 },
    ],
    effect: { target: 'forge', value: 0.15 },
  },
  {
    id: 'comprehension_recruit',
    name: '由学入道',
    description: '参悟心得出现率 +15%',
    requirements: [
      { building: 'scriptureHall', level: 3 },
      { building: 'recruitmentPavilion', level: 2 },
    ],
    effect: { target: 'scriptureHall', value: 0.15 },
  },
  {
    id: 'market_mining',
    name: '矿市通流',
    description: '坊市商品品质上限 +1',
    requirements: [
      { building: 'spiritMine', level: 5 },
      { building: 'market', level: 3 },
    ],
    effect: { target: 'market', value: 1 },
  },
  {
    id: 'alchemy_forging',
    name: '丹火同炉',
    description: '炼丹吞吐 +25%',
    requirements: [
      { building: 'alchemyFurnace', level: 5 },
      { building: 'forge', level: 5 },
    ],
    effect: { target: 'alchemyFurnace', value: 0.25 },
  },
  {
    id: 'alchemy_forging_forge',
    name: '丹火同炉',
    description: '锻造吞吐 +25%',
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
      return '解锁预览：每日刷新 +1 次'
    case 'spiritMine':
      return '解锁预览：灵石 +0.5/秒 | 矿材 +0.05/秒'
    case 'alchemyFurnace':
      return '解锁预览：丹药效力 +20%'
    case 'forge':
      return '解锁预览：锻造成功 +10%'
    case 'scriptureHall':
      return '解锁预览：藏经容量提升'
    case 'recruitmentPavilion':
      return '解锁预览：招募消耗 -10%'
    default:
      return ''
  }
}
