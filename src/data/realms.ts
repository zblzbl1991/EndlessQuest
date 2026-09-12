import type { RealmStage } from '../types/character'

/**
 * V2 exponential realm curve (design doc §5.1).
 *
 * RealmCost(i) = 10^REALM_EXP[i] is the total cultivation to cross realm i
 * (split across 4 sub-stages). Cultivation speed is derived from the same
 * table (see getRealmSpeedMult) so rate growth covers cost growth — the core
 * incremental balance law. All values stay far below Number.MAX_VALUE (max
 * 1e40 here); utils/Decimal.ts exists for anything that outgrows doubles.
 */
export const REALM_EXP = [2, 4, 6, 9, 13, 18, 24, 31, 40] as const

/** First realm should take this long for a fresh base-stat disciple (seconds). */
export const PACING_FIRST_REALM_SECONDS = 600
/** Each subsequent realm takes this many times longer on a fresh run. */
export const PACING_TIME_GROWTH = 2
/** Base cultivation rate the pacing anchors assume (kept in sync with CultivationEngine). */
export const PACING_BASE_CULTIVATION_RATE = 5

export interface RealmDef {
  name: string
  stages: string[]
  cultivationCosts: number[]
  breakthroughExtra: string | null
  unlockContent: string
  tribulationPower?: number
  statMultiplier: number
}

const STAGE_NAMES: string[] = ['初期', '中期', '后期', '圆满']

/** Total cultivation required to cross realm i. */
export function getRealmCost(realmIndex: number): number {
  return Math.pow(10, REALM_EXP[realmIndex])
}

/**
 * Cultivation speed multiplier of realm i, derived from the cost curve so a
 * fresh base-stat disciple clears realm i in about
 * PACING_FIRST_REALM_SECONDS × PACING_TIME_GROWTH^i.
 * Rate growth therefore always covers cost growth.
 */
export function getRealmSpeedMult(realmIndex: number): number {
  return (
    Math.pow(10, REALM_EXP[realmIndex]) /
    (PACING_FIRST_REALM_SECONDS * PACING_TIME_GROWTH ** realmIndex * PACING_BASE_CULTIVATION_RATE)
  )
}

/**
 * Economy coupling (§四 resource chain): spirit stone production scales with
 * the sect's highest reached realm so exponential breakthrough costs stay
 * affordable. Realm 0 keeps the vanilla economy (×1).
 */
export function getRealmEconomyMult(realmIndex: number): number {
  return Math.pow(10, (REALM_EXP[realmIndex] - REALM_EXP[0]) * 0.9)
}

/**
 * Spirit stone storage must never be the reason a breakthrough is unaffordable:
 * the cap floor guarantees room for 10× the realm's breakthrough cost.
 */
export function getRealmStoneFloor(realmIndex: number): number {
  return getRealmCost(realmIndex) * 0.2
}

const REALM_META: {
  name: string
  unlockContent: string
  breakthroughExtra: string | null
  tribulationPower?: number
}[] = [
  { name: '炼气期', unlockContent: '基础功法、灵品装备掉落', breakthroughExtra: null },
  { name: '筑基期', unlockContent: '秘境解锁（落云洞）、装备自动最优', breakthroughExtra: '需消耗大量灵石' },
  { name: '金丹期', unlockContent: '灵宠系统、炼丹自动化', breakthroughExtra: '金丹劫 + 灵石', tribulationPower: 0.8 },
  { name: '元婴期', unlockContent: '弟子系统（经营线）', breakthroughExtra: '元婴劫 + 灵石', tribulationPower: 1.0 },
  {
    name: '化神期',
    unlockContent: '高级功法、飞剑、大境界自动突破',
    breakthroughExtra: '天劫 + 灵石',
    tribulationPower: 1.2,
  },
  { name: '炼虚期', unlockContent: '飞升预览面板', breakthroughExtra: '天劫 + 灵石', tribulationPower: 1.3 },
  { name: '合体期', unlockContent: '自动秘境全托管', breakthroughExtra: '天劫 + 灵石', tribulationPower: 1.4 },
  { name: '大乘期', unlockContent: '自动飞升', breakthroughExtra: '天劫 + 灵石', tribulationPower: 1.45 },
  { name: '渡劫期', unlockContent: '飞升仙界', breakthroughExtra: '天劫 + 全建筑满级', tribulationPower: 1.5 },
]

export const REALMS: RealmDef[] = REALM_META.map((meta, i) => ({
  name: meta.name,
  stages: STAGE_NAMES,
  // Per-stage cultivation requirements: fractions of the realm total (sum = 1).
  cultivationCosts: [0.05, 0.15, 0.3, 0.5].map((f) => getRealmCost(i) * f),
  breakthroughExtra: meta.breakthroughExtra,
  unlockContent: meta.unlockContent,
  tribulationPower: meta.tribulationPower,
  statMultiplier: 8,
}))

export function getRealmName(realmIndex: number, stage: RealmStage): string {
  const realm = REALMS[realmIndex]
  if (!realm) return '未知'
  const stageName = realm.stages[stage] ?? ''
  return `${realm.name} ${stageName}`
}

export function getCultivationNeeded(realmIndex: number, stage: number): number {
  return REALMS[realmIndex]?.cultivationCosts[stage] ?? Infinity
}

export interface BreakthroughResourceCost {
  spiritStone: number
  spiritEnergy: number
  herb?: number
}

/**
 * Breakthrough costs for major realm transitions (target realm 1-8).
 * Linked to the realm curve: spirit stones = 2% of the target realm cost.
 */
export const BREAKTHROUGH_COSTS: Record<number, BreakthroughResourceCost> = Object.fromEntries(
  REALM_EXP.map((exp, i) => [
    i,
    {
      spiritStone: Math.pow(10, exp) * 0.02,
      spiritEnergy: 0,
      herb: [0, 50, 100, 200, 400, 800, 1200, 1800, 2700][i] ?? 0,
    },
  ]).slice(1)
)

/**
 * Spirit stone costs for minor stage breakthroughs (within same realm),
 * generated from the next realm's major cost so they never outpace it.
 * Indexed by [realmIndex][targetStage], targetStage 1-3.
 */
export const MINOR_BREAKTHROUGH_COSTS: Record<number, Record<number, number>> = Object.fromEntries(
  REALM_EXP.map((_, i) => {
    if (i >= REALM_EXP.length - 1) return [i, {}]
    const major = BREAKTHROUGH_COSTS[i + 1].spiritStone
    return [i, { 1: major * 0.02, 2: major * 0.04, 3: major * 0.08 }]
  })
)

export const MINOR_BREAKTHROUGH_ENERGY_COSTS: Record<number, Record<number, number>> = Object.fromEntries(
  REALM_EXP.map((_, i) => [i, { 1: 0, 2: 0, 3: 0 }])
)

export const MINOR_BREAKTHROUGH_HERB_COSTS: Record<number, Record<number, number>> = {
  0: { 1: 0, 2: 0, 3: 5 },
  1: { 1: 0, 2: 5, 3: 15 },
  2: { 1: 5, 2: 15, 3: 30 },
  3: { 1: 15, 2: 30, 3: 60 },
  4: { 1: 30, 2: 60, 3: 120 },
  5: { 1: 60, 2: 120, 3: 240 },
  6: { 1: 120, 2: 240, 3: 480 },
  7: { 1: 240, 2: 480, 3: 960 },
  8: { 1: 480, 2: 960, 3: 1920 },
}

export function getBreakthroughCost(realmIndex: number, currentStage: number): number {
  if (currentStage >= 3) {
    // Major realm breakthrough
    return BREAKTHROUGH_COSTS[realmIndex + 1]?.spiritStone ?? 0
  }
  // Minor stage breakthrough
  return MINOR_BREAKTHROUGH_COSTS[realmIndex]?.[currentStage + 1] ?? 0
}

export function getMinorBreakthroughEnergyCost(realmIndex: number, stage: number): number {
  return MINOR_BREAKTHROUGH_ENERGY_COSTS[realmIndex]?.[stage + 1] ?? Infinity
}

export function getBreakthroughResourceCost(realmIndex: number, currentStage: number): BreakthroughResourceCost {
  if (currentStage >= 3) {
    return BREAKTHROUGH_COSTS[realmIndex + 1] ?? { spiritStone: Infinity, spiritEnergy: 0, herb: 0 }
  }

  return {
    spiritStone: MINOR_BREAKTHROUGH_COSTS[realmIndex]?.[currentStage + 1] ?? Infinity,
    spiritEnergy: 0,
    herb: MINOR_BREAKTHROUGH_HERB_COSTS[realmIndex]?.[currentStage + 1] ?? 0,
  }
}
