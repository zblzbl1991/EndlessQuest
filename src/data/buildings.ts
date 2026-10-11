import type { SpecialtyType } from '../types/character'
import type { Building, BuildingType, ResourceCaps } from '../types/sect'
import { getAlchemyBuff, getForgeBuff, getMarketBuff, getRecruitBuff } from '../systems/economy/BuildingEffects'
import { getTechniqueCodexCapacity } from '../systems/technique/TechniqueSystem'
import { safeExpCost } from '../utils/Decimal'

export interface BuildingUpgradeCost {
  spiritStone: number
  herb?: number
  ore?: number
}

/**
 * V2.1 工单 03（设计稿 §六）：Generator 建筑走标准增量成本
 * `baseCost × growth^level`（灵石单项），等级无上限，成本上界由
 * safeExpCost 封顶在 1e300；服务型建筑（坊市/聚仙台/主殿）保留多项式 + 材料。
 */
export interface GeneratorCostSpec {
  baseCost: number
  growth: number
}

export interface BuildingDef {
  type: BuildingType
  name: string
  description: string
  maxLevel: number
  upgradeCost: (level: number) => BuildingUpgradeCost
  unlockCondition: string
  expandable?: boolean
  generator?: GeneratorCostSpec
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

/**
 * Helper: compute spirit stone cost and optional herb/ore costs for building upgrades.
 * High-level upgrades (level >= 5) require additional materials.
 */
function buildingUpgradeCost(level: number, herbStart: number, oreStart: number): BuildingUpgradeCost {
  const spiritStone = Math.round(200 * Math.pow(level + 1, 1.7))
  const result: BuildingUpgradeCost = { spiritStone }

  if (level >= herbStart) {
    // Herb cost ramps from 10 at herbStart, +8 per additional level
    result.herb = 10 + (level - herbStart) * 8
  }
  if (level >= oreStart) {
    // Ore cost ramps from 10 at oreStart, +8 per additional level
    result.ore = 10 + (level - oreStart) * 8
  }

  return result
}

function generatorUpgradeCost(spec: GeneratorCostSpec, level: number): BuildingUpgradeCost {
  return { spiritStone: safeExpCost(spec.baseCost, spec.growth, level) }
}

type GeneratorBuildingType =
  | 'spiritField'
  | 'spiritMine'
  | 'scriptureHall'
  | 'alchemyFurnace'
  | 'forge'
  | 'immortalVein'
  | 'immortalField'
  | 'immortalPalace'

/** Generator 成本参数（设计稿 §6.1；聚灵阵并入灵田，御兽峰未实装；仙界三座见工单 07）。 */
export const GENERATOR_SPECS: Record<GeneratorBuildingType, GeneratorCostSpec> = {
  spiritField: { baseCost: 150, growth: 1.16 },
  spiritMine: { baseCost: 200, growth: 1.17 },
  scriptureHall: { baseCost: 400, growth: 1.2 },
  alchemyFurnace: { baseCost: 800, growth: 1.22 },
  forge: { baseCost: 800, growth: 1.22 },
  // 仙界（V2.1 工单 07）：成本 1e42 量级起步（真仙期 economyMult = 1e48 收入域），
  // growth 低于产出 growth——越买越划算，构成仙界灵石的主要去处。
  immortalVein: { baseCost: 1e42, growth: 1.18 },
  immortalField: { baseCost: 3e42, growth: 1.19 },
  immortalPalace: { baseCost: 1e43, growth: 1.2 },
}

export const BUILDING_DEFS: BuildingDef[] = [
  {
    type: 'mainHall',
    name: '主殿',
    description: '宗门中枢，决定地块上限与整体展开能力。等级上限随宗门最高境界增长。',
    // 动态上限见 getBuildingMaxLevel：炼气 2 级起步，每进一大境界 +2（渡劫 18）
    maxLevel: 18,
    upgradeCost: (level) => buildingUpgradeCost(level, 7, 5),
    unlockCondition: '初始',
  },
  {
    type: 'spiritMine',
    name: '灵矿',
    description: '产出灵石与矿材，是宗门的稳定灵石来源。',
    maxLevel: Number.POSITIVE_INFINITY,
    generator: { baseCost: 200, growth: 1.17 },
    upgradeCost: (level) => generatorUpgradeCost(GENERATOR_SPECS.spiritMine, level),
    unlockCondition: '初始',
    expandable: true,
  },
  {
    type: 'spiritField',
    name: '灵田',
    description: '产出灵气与灵草，支撑修炼与炼丹需求（聚灵阵之职并入灵田）。',
    maxLevel: Number.POSITIVE_INFINITY,
    generator: { baseCost: 150, growth: 1.16 },
    upgradeCost: (level) => generatorUpgradeCost(GENERATOR_SPECS.spiritField, level),
    unlockCondition: '初始',
    expandable: true,
  },
  {
    type: 'market',
    name: '坊市',
    description: '来往商旅汇聚，可换购宗门所需物资。',
    maxLevel: 8,
    upgradeCost: (level) => buildingUpgradeCost(level, 6, 7),
    unlockCondition: '主殿 Lv1',
  },
  {
    type: 'alchemyFurnace',
    name: '丹炉',
    description: '炼制丹药与灵液，补足修行与战备。',
    maxLevel: Number.POSITIVE_INFINITY,
    generator: { baseCost: 800, growth: 1.22 },
    upgradeCost: (level) => generatorUpgradeCost(GENERATOR_SPECS.alchemyFurnace, level),
    unlockCondition: '主殿 Lv2 + 灵田 Lv2',
  },
  {
    type: 'forge',
    name: '锻器坊',
    description: '锻造并精炼器物，提升弟子战力。',
    maxLevel: Number.POSITIVE_INFINITY,
    generator: { baseCost: 800, growth: 1.22 },
    upgradeCost: (level) => generatorUpgradeCost(GENERATOR_SPECS.forge, level),
    unlockCondition: '主殿 Lv2',
  },
  {
    type: 'scriptureHall',
    name: '藏经阁',
    description: '扩充藏经容量，沉淀宗门传承；弟子修炼效率随阁中藏经增长。',
    maxLevel: Number.POSITIVE_INFINITY,
    generator: { baseCost: 400, growth: 1.2 },
    upgradeCost: (level) => generatorUpgradeCost(GENERATOR_SPECS.scriptureHall, level),
    unlockCondition: '主殿 Lv3',
  },
  {
    type: 'recruitmentPavilion',
    name: '聚仙台',
    description: '广纳有缘之人，补充门中弟子。',
    maxLevel: 6,
    upgradeCost: (level) => buildingUpgradeCost(level, 7, 5),
    unlockCondition: '主殿 Lv3',
  },
  // ── 仙界建筑线（V2.1 工单 07）：飞升后解锁，飞升重置时保留 ──
  {
    type: 'immortalVein',
    name: '仙灵脉',
    description: '仙界灵脉汇聚，灵石产出远超凡界灵矿。',
    maxLevel: Number.POSITIVE_INFINITY,
    generator: GENERATOR_SPECS.immortalVein,
    upgradeCost: (level) => generatorUpgradeCost(GENERATOR_SPECS.immortalVein, level),
    unlockCondition: '真仙期',
  },
  {
    type: 'immortalField',
    name: '仙田',
    description: '仙田自有岁时，灵气与灵草产量倍增。',
    maxLevel: Number.POSITIVE_INFINITY,
    generator: GENERATOR_SPECS.immortalField,
    upgradeCost: (level) => generatorUpgradeCost(GENERATOR_SPECS.immortalField, level),
    unlockCondition: '真仙期',
  },
  {
    type: 'immortalPalace',
    name: '仙宫',
    description: '仙宫道韵笼罩全宗，弟子修炼效率随宫阙增长。',
    maxLevel: Number.POSITIVE_INFINITY,
    generator: GENERATOR_SPECS.immortalPalace,
    upgradeCost: (level) => generatorUpgradeCost(GENERATOR_SPECS.immortalPalace, level),
    unlockCondition: '真仙期',
  },
]

/** Generator 成本参数见文件前部 GENERATOR_SPECS（设计稿 §6.1）。 */

/**
 * 建筑等级上限：主殿随宗门最高境界动态放宽（(bestRealm+1)×2，炼气 2 → 渡劫 18），
 * Generator 无上限，服务型建筑取 def.maxLevel。
 */
export function getBuildingMaxLevel(type: BuildingType, bestRealm = 0): number {
  if (type === 'mainHall') return Math.max(2, (bestRealm + 1) * 2)
  return getBuildingDef(type)?.maxLevel ?? 0
}

export function getBuildingDef(type: BuildingType): BuildingDef | undefined {
  return BUILDING_DEFS.find((building) => building.type === type)
}

export function isResourceNode(type: BuildingType): boolean {
  return type === 'spiritField' || type === 'spiritMine'
}

export function getBuildingNodeCap(mainHallLevel: number): number {
  if (mainHallLevel >= 6) return 4
  if (mainHallLevel >= 4) return 3
  if (mainHallLevel >= 2) return 2
  return 1
}

export function getBuildingExpandCost(type: BuildingType, currentCount: number): { spiritStone: number } {
  const nextCount = Math.max(1, currentCount + 1)
  const base = type === 'spiritField' ? 140 : 180
  return { spiritStone: Math.round(base * Math.pow(nextCount, 1.6)) }
}

// ---------------------------------------------------------------------------
// 建筑 Milestone（V2.1 工单 03，设计稿 §6.2）：旧玩法"变强变自动"的内容阀门。
// rateMult / cultivation / throughput / forgeSuccess 为真实计算效果（tickSlice、
// BuildingEffects 消费）；unlock 为自动化能力挂点（自动化面板工单 05 消费）。
// ---------------------------------------------------------------------------

export type MilestoneResource = 'spiritEnergy' | 'spiritStone' | 'herb' | 'ore'

/** 自动化/系统能力挂点（isCapabilityUnlocked 查询，工单 05 自动化面板消费）。 */
export type BuildingCapability =
  | 'autoAlchemy'
  | 'autoSellJunk'
  | 'autoUpgradeBuildings'
  | 'autoBuyResources'
  | 'alchemyRotate'
  | 'alchemyByproduct'
  | 'autoReinforce'
  | 'forgeSafeGuard'
  | 'divineForge'
  | 'insightBoost'
  | 'techniqueFusion'
  | 'herbGarden'
  | 'herbQuality'

export type BuildingMilestoneEffect =
  | { kind: 'rateMult'; target: MilestoneResource; value: number }
  | { kind: 'cultivationPerLevel'; value: number }
  | { kind: 'cultivationPerLearnedTechnique'; value: number }
  | { kind: 'alchemyThroughput'; value: number }
  | { kind: 'forgeSuccess'; value: number }
  | { kind: 'unlock'; capability: BuildingCapability }

export interface BuildingMilestone {
  level: number
  name: string
  description: string
  effects: BuildingMilestoneEffect[]
}

export const BUILDING_MILESTONES: Partial<Record<BuildingType, BuildingMilestone[]>> = {
  // 灵田（含聚灵阵之职）
  spiritField: [
    {
      level: 10,
      name: '灵气充盈',
      description: '灵气产量 ×2',
      effects: [{ kind: 'rateMult', target: 'spiritEnergy', value: 2 }],
    },
    {
      level: 25,
      name: '丹方自转',
      description: '解锁自动炼丹（自动化面板）',
      effects: [{ kind: 'unlock', capability: 'autoAlchemy' }],
    },
    {
      level: 50,
      name: '地脉共鸣',
      description: '灵气产量 ×3',
      effects: [{ kind: 'rateMult', target: 'spiritEnergy', value: 3 }],
    },
    {
      level: 100,
      name: '灵脉交汇',
      description: '灵石 / 灵草 / 矿材产量 +50%',
      effects: [
        { kind: 'rateMult', target: 'spiritStone', value: 1.5 },
        { kind: 'rateMult', target: 'herb', value: 1.5 },
        { kind: 'rateMult', target: 'ore', value: 1.5 },
      ],
    },
    {
      level: 250,
      name: '灵压同频',
      description: '每级修炼速度 +1%',
      effects: [{ kind: 'cultivationPerLevel', value: 0.01 }],
    },
    {
      level: 500,
      name: '万物自洽',
      description: '解锁自动升级建筑（自动化面板）',
      effects: [{ kind: 'unlock', capability: 'autoUpgradeBuildings' }],
    },
  ],
  spiritMine: [
    {
      level: 10,
      name: '矿脉旺盛',
      description: '灵石产量 ×2',
      effects: [{ kind: 'rateMult', target: 'spiritStone', value: 2 }],
    },
    {
      level: 25,
      name: '废装自售',
      description: '解锁自动出售凡品装备（自动化面板）',
      effects: [{ kind: 'unlock', capability: 'autoSellJunk' }],
    },
    {
      level: 50,
      name: '矿材精炼',
      description: '矿材产量 ×3',
      effects: [{ kind: 'rateMult', target: 'ore', value: 3 }],
    },
    {
      level: 100,
      name: '石母赐福',
      description: '灵石产量 ×3',
      effects: [{ kind: 'rateMult', target: 'spiritStone', value: 3 }],
    },
  ],
  scriptureHall: [
    {
      level: 25,
      name: '参悟心得',
      description: '功法熟练度获取 ×2（自动化面板）',
      effects: [{ kind: 'unlock', capability: 'insightBoost' }],
    },
    {
      level: 50,
      name: '功法融合',
      description: '解锁功法融合（自动化面板）',
      effects: [{ kind: 'unlock', capability: 'techniqueFusion' }],
    },
    {
      level: 100,
      name: '万法归宗',
      description: '每已学功法全体修炼速度 +2%',
      effects: [{ kind: 'cultivationPerLearnedTechnique', value: 0.02 }],
    },
  ],
  alchemyFurnace: [
    { level: 10, name: '炉火纯青', description: '炼丹吞吐 +50%', effects: [{ kind: 'alchemyThroughput', value: 1.5 }] },
    {
      level: 25,
      name: '丹方自换',
      description: '解锁丹方自动切换（自动化面板）',
      effects: [{ kind: 'unlock', capability: 'alchemyRotate' }],
    },
    { level: 50, name: '九转丹枢', description: '炼丹吞吐再 ×2', effects: [{ kind: 'alchemyThroughput', value: 2 }] },
    {
      level: 100,
      name: '丹成有灵',
      description: '每炉附带极品材料（自动化面板）',
      effects: [{ kind: 'unlock', capability: 'alchemyByproduct' }],
    },
  ],
  forge: [
    { level: 10, name: '炉温如意', description: '锻造成功率 +15%', effects: [{ kind: 'forgeSuccess', value: 0.15 }] },
    {
      level: 25,
      name: '器灵初醒',
      description: '解锁自动强化（自动化面板）',
      effects: [{ kind: 'unlock', capability: 'autoReinforce' }],
    },
    {
      level: 50,
      name: '百炼成钢',
      description: '强化保底不掉级（自动化面板）',
      effects: [{ kind: 'unlock', capability: 'forgeSafeGuard' }],
    },
    {
      level: 100,
      name: '神器之炉',
      description: '解锁神器锻造（自动化面板）',
      effects: [{ kind: 'unlock', capability: 'divineForge' }],
    },
  ],
  // 仙界（工单 07）：量级按仙界 Generator 曲线放大
  immortalVein: [
    {
      level: 10,
      name: '仙脉初开',
      description: '灵石产量 ×2',
      effects: [{ kind: 'rateMult', target: 'spiritStone', value: 2 }],
    },
    {
      level: 50,
      name: '仙脉成海',
      description: '灵石产量 ×3',
      effects: [{ kind: 'rateMult', target: 'spiritStone', value: 3 }],
    },
    {
      level: 100,
      name: '万脉朝宗',
      description: '灵草 / 矿材产量 ×2',
      effects: [
        { kind: 'rateMult', target: 'herb', value: 2 },
        { kind: 'rateMult', target: 'ore', value: 2 },
      ],
    },
  ],
  immortalField: [
    {
      level: 10,
      name: '仙田灵岁',
      description: '灵气产量 ×2',
      effects: [{ kind: 'rateMult', target: 'spiritEnergy', value: 2 }],
    },
    {
      level: 50,
      name: '仙田千顷',
      description: '灵气 / 灵草产量 ×3',
      effects: [
        { kind: 'rateMult', target: 'spiritEnergy', value: 3 },
        { kind: 'rateMult', target: 'herb', value: 3 },
      ],
    },
  ],
  immortalPalace: [
    {
      level: 25,
      name: '宫阙初成',
      description: '每级修炼速度再 +1%',
      effects: [{ kind: 'cultivationPerLevel', value: 0.01 }],
    },
    {
      level: 75,
      name: '仙宫巍峨',
      description: '每级修炼速度再 +1%',
      effects: [{ kind: 'cultivationPerLevel', value: 0.01 }],
    },
  ],
}

export function getBuildingMilestones(type: BuildingType): BuildingMilestone[] {
  return BUILDING_MILESTONES[type] ?? []
}

/** 已达成（building.level ≥ milestone.level）的里程碑。 */
export function getMilestonesReached(type: BuildingType, level: number): BuildingMilestone[] {
  return getBuildingMilestones(type).filter((m) => level >= m.level)
}

/** 下一档未达成里程碑（UI 预告）。 */
export function getNextMilestone(type: BuildingType, level: number): BuildingMilestone | null {
  return getBuildingMilestones(type).find((m) => level < m.level) ?? null
}

export function isCapabilityUnlocked(buildings: Building[], capability: BuildingCapability): boolean {
  return buildings.some((b) =>
    getMilestonesReached(b.type, b.level).some((m) =>
      m.effects.some((e) => e.kind === 'unlock' && e.capability === capability)
    )
  )
}

/** 全宗里程碑资源倍率：各建筑已达成 rateMult 的连乘。 */
export function getSectMilestoneRateMult(buildings: Building[], resource: MilestoneResource): number {
  let mult = 1
  for (const b of buildings) {
    for (const m of getMilestonesReached(b.type, b.level)) {
      for (const e of m.effects) {
        if (e.kind === 'rateMult' && e.target === resource) mult *= e.value
      }
    }
  }
  return mult
}

/**
 * 全宗里程碑修炼倍率：灵田 Lv250 每级 +1% × 藏经阁 Lv100 每已学功法 +2%。
 * 藏经阁基础效果（修炼效率 +2%/级，软上限 +200%）单列：getScriptureCultivationMult。
 */
export function getSectMilestoneCultivationMult(buildings: Building[], learnedTechniqueCount: number): number {
  let mult = 1
  for (const b of buildings) {
    for (const m of getMilestonesReached(b.type, b.level)) {
      for (const e of m.effects) {
        if (e.kind === 'cultivationPerLevel') {
          mult *= 1 + e.value * Math.max(0, b.level - m.level + 1)
        } else if (e.kind === 'cultivationPerLearnedTechnique') {
          mult *= 1 + e.value * Math.max(0, learnedTechniqueCount)
        }
      }
    }
  }
  return mult
}

/** 藏经阁基础效果：修炼效率 +2%/级（乘法，软上限 +200%）。 */
export function getScriptureCultivationMult(scriptureHallLevel: number): number {
  if (scriptureHallLevel < 1) return 1
  return Math.min(3, 1 + 0.02 * scriptureHallLevel)
}

/** 全宗里程碑炼丹吞吐倍率（生产队列速度）。 */
export function getSectMilestoneAlchemyThroughput(buildings: Building[]): number {
  let mult = 1
  for (const b of buildings) {
    if (b.type !== 'alchemyFurnace') continue
    for (const m of getMilestonesReached(b.type, b.level)) {
      for (const e of m.effects) {
        if (e.kind === 'alchemyThroughput') mult *= e.value
      }
    }
  }
  return mult
}

/** 锻造里程碑成功率加成（BuildingEffects.getForgeBuff 消费）。 */
export function getForgeMilestoneSuccessBonus(forgeLevel: number): number {
  let bonus = 0
  for (const m of getMilestonesReached('forge', forgeLevel)) {
    for (const e of m.effects) {
      if (e.kind === 'forgeSuccess') bonus += e.value
    }
  }
  return bonus
}

// ---------------------------------------------------------------------------
// 批量购买（V2.1 工单 03）：×1 / ×10 / ×100 / MAX。
// Generator 用等比闭式解（dec 域），服务型建筑逐级累加。
// ---------------------------------------------------------------------------

export interface BatchUpgradeInfo {
  levels: number
  totalCost: number
}

/**
 * 从 currentLevel 起最多买 desiredLevels 级（受等级上限与灵石约束），
 * 返回实际可买级数与总灵石成本；买不起一级时 levels = 0。
 */
export function getBatchUpgradeInfo(
  type: BuildingType,
  currentLevel: number,
  desiredLevels: number,
  spiritStone: number,
  bestRealm = 0
): BatchUpgradeInfo {
  const maxRemaining = getBuildingMaxLevel(type, bestRealm) - currentLevel
  const desired = Math.min(desiredLevels, maxRemaining)
  // NaN 防御；+Infinity 是合法输入（MAX 语义，Generator 无上限）
  if (Number.isNaN(desired) || desired <= 0) return { levels: 0, totalCost: 0 }

  const spec = (GENERATOR_SPECS as Partial<Record<BuildingType, GeneratorCostSpec>>)[type]
  if (spec) {
    // 等比闭式解：total(n) = base·g^lv·(g^n − 1)/(g − 1)
    const first = safeExpCost(spec.baseCost, spec.growth, currentLevel)
    if (spiritStone < first) return { levels: 0, totalCost: 0 }
    const ratio = (spiritStone * (spec.growth - 1)) / first
    const byBudget = Math.floor(Math.log(1 + ratio) / Math.log(spec.growth))
    const levels = Math.max(1, Math.min(desired, byBudget))
    const totalCost = Math.min(
      spiritStone,
      Math.ceil((first * (Math.pow(spec.growth, levels) - 1)) / (spec.growth - 1))
    )
    return { levels, totalCost }
  }

  const def = getBuildingDef(type)
  if (!def) return { levels: 0, totalCost: 0 }
  let totalCost = 0
  let levels = 0
  for (let i = 0; i < desired; i++) {
    const cost = def.upgradeCost(currentLevel + i).spiritStone
    if (totalCost + cost > spiritStone) break
    totalCost += cost
    levels += 1
  }
  return { levels, totalCost }
}

/**
 * V2.1 工单 03：Generator 产出曲线（设计稿 §6.1）。
 * 1 级数值与旧线性曲线完全一致（灵气 3、灵草 0.1、灵石 0.5、矿材 0.05），
 * 之后按指数增长——早期校准不变，中后期经营层重新与境界曲线耦合。
 */
export function getSpiritFieldRate(level: number): number {
  if (level < 1) return 0
  return 3 * Math.pow(1.1, level - 1)
}

export function getSpiritFieldHerbRate(level: number): number {
  if (level < 1) return 0
  return 0.1 * Math.pow(1.08, level - 1)
}

export function getSpiritMineRate(level: number): number {
  if (level < 1) return 0
  return 0.5 * Math.pow(1.1, level - 1)
}

export function getSpiritMineOreRate(level: number): number {
  if (level < 1) return 0
  return 0.05 * Math.pow(1.09, level - 1)
}

// ── 仙界建筑产出（V2.1 工单 07）：1 级锚定后 ×1.2 级增长（高于成本 growth）。
// 全部再经 realmEconomyMult 等统一乘区，真仙期起步即有量级竞争力。 ──

export function getImmortalVeinStoneRate(level: number): number {
  if (level < 1) return 0
  return 50 * Math.pow(1.2, level - 1)
}

export function getImmortalFieldEnergyRate(level: number): number {
  if (level < 1) return 0
  return 40 * Math.pow(1.2, level - 1)
}

export function getImmortalFieldHerbRate(level: number): number {
  if (level < 1) return 0
  return 2 * Math.pow(1.18, level - 1)
}

/** 仙宫全局修炼效率：+5%/级，软上限 ×10（Lv180）。 */
export function getImmortalPalaceCultivationMult(level: number): number {
  if (level < 1) return 1
  return Math.min(10, 1 + 0.05 * level)
}

export function calcResourceCaps(
  spiritFieldLevel: number,
  spiritMineLevel: number,
  spiritFieldCount = 1,
  spiritMineCount = 1
): ResourceCaps {
  return {
    spiritEnergy: (500 + spiritFieldLevel * 300) * Math.max(1, spiritFieldCount),
    herb: (200 + spiritFieldLevel * 100) * Math.max(1, spiritFieldCount),
    ore: (200 + spiritMineLevel * 100) * Math.max(1, spiritMineCount),
  }
}

export function getBuildingEffectText(building: Building): string {
  if (!building.unlocked || building.level === 0) return ''
  observeBuildingLevel(building.type, building.level)

  switch (building.type) {
    case 'mainHall':
      return `宗门位阶 ${building.level} | 资源地块上限 ${getBuildingNodeCap(building.level)}`
    case 'spiritField':
      return `单座灵气 +${formatRate(getSpiritFieldRate(building.level))}/秒 | 单座灵草 +${getSpiritFieldHerbRate(building.level).toFixed(1)}/秒`
    case 'spiritMine':
      return `单座灵石 +${getSpiritMineRate(building.level).toFixed(1)}/秒 | 单座矿材 +${getSpiritMineOreRate(building.level).toFixed(2)}/秒`
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
    // 仙界建筑（工单 07）
    case 'immortalVein':
      return `单座灵石 +${formatRate(getImmortalVeinStoneRate(building.level))}/秒`
    case 'immortalField':
      return `单座灵气 +${formatRate(getImmortalFieldEnergyRate(building.level))}/秒 | 单座灵草 +${formatRate(getImmortalFieldHerbRate(building.level))}/秒`
    case 'immortalPalace':
      return `全体修炼效率 ×${getImmortalPalaceCultivationMult(building.level).toFixed(2)}`
    default:
      return ''
  }
}

/** 效果文案的数字格式（>=1000 走中文单位）。 */
function formatRate(value: number): string {
  if (value >= 1000) return formatNumberZh(value)
  return value >= 10 ? value.toFixed(0) : value.toFixed(1)
}

function formatNumberZh(value: number): string {
  const units = ['', '万', '亿', '兆', '京', '垓', '秭', '穰', '沟', '涧', '正', '载', '极']
  const exp = Math.floor(Math.log10(value))
  const unitIndex = Math.min(Math.floor(exp / 4), units.length - 1)
  const scaled = value / 10 ** (unitIndex * 4)
  return `${parseFloat(scaled.toFixed(1))}${units[unitIndex]}`
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
    case 'immortalVein':
      return '解锁预览：仙界灵石产出'
    case 'immortalField':
      return '解锁预览：仙界灵气 / 灵草产出'
    case 'immortalPalace':
      return '解锁预览：全体修炼效率提升'
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
