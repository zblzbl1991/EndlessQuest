/**
 * 祝福分系 Build 系统（V2.2 map 工单 02，设计稿 §九）。
 *
 * 六系 × 6 阶梯度 = 36 种祝福；同 id 重复获取自动升阶（tier 1-3，队列内同 id
 * 计数即阶数），数值查 values[tier-1]。聚合函数 aggregateBlessingEffects 是
 * 战斗修饰与奖励乘区的唯一数据源——旧硬编码分支（battleFocus atk×1.15 等）
 * 已迁移为 tier1 数值，行为等价由单测锁定。
 */
import type { BlessingId } from '../types/adventure'

export type BlessingSchool = 'sword' | 'thunder' | 'critical' | 'body' | 'beast' | 'spirit'

export const BLESSING_SCHOOL_NAMES: Record<BlessingSchool, string> = {
  sword: '剑修',
  thunder: '雷法',
  critical: '会心',
  body: '体修',
  beast: '御兽',
  spirit: '灵息',
}

/** 祝福效果钩子（全部映射到 CombatEngine / 奖励结算的既有或新增机制点）。 */
export type BlessingEffect =
  | { kind: 'atkPct' }
  | { kind: 'defPct' }
  | { kind: 'spdPct' }
  | { kind: 'hpPct' }
  | { kind: 'critAdd' }
  | { kind: 'critDmgAdd' }
  | { kind: 'spiritRegen' }
  | { kind: 'healOnKill' }
  | { kind: 'lootPct' }
  | { kind: 'layerHealPct' }
  | { kind: 'thornsPct' }
  | { kind: 'rewardPct'; resource: 'spiritStone' | 'herb' | 'ore' | 'all' }

export interface BlessingDef {
  id: BlessingId
  name: string
  school: BlessingSchool
  tier: 1 | 2 | 3
  description: string
  /** tier 1/2/3 的数值表（语义由 effect 决定：百分比/加值/每回合点数）。 */
  values: [number, number, number]
  effect: BlessingEffect
}

const def = (
  id: BlessingId,
  name: string,
  school: BlessingSchool,
  tier: 1 | 2 | 3,
  effect: BlessingEffect,
  values: [number, number, number],
  description: string
): BlessingDef => ({ id, name, school, tier, effect, values, description })

export const BLESSING_DEFS: Record<BlessingId, BlessingDef> = {
  // ── 剑修系：攻击强化 ──
  battleFocus: def(
    'battleFocus',
    '战意凝神',
    'sword',
    1,
    { kind: 'atkPct' },
    [0.15, 0.25, 0.4],
    '战斗中攻击提高 15%/25%/40%（随阶）。'
  ),
  flame_heart: def(
    'flame_heart',
    '炎心',
    'sword',
    1,
    { kind: 'atkPct' },
    [0.15, 0.25, 0.4],
    '战斗中攻击提高 15%/25%/40%（随阶）。'
  ),
  wind_step: def(
    'wind_step',
    '踏风',
    'sword',
    1,
    { kind: 'atkPct' },
    [0.15, 0.25, 0.4],
    '战斗中攻击提高 15%/25%/40%（随阶）。'
  ),
  sword_qi: def(
    'sword_qi',
    '剑气纵横',
    'sword',
    2,
    { kind: 'atkPct' },
    [0.22, 0.35, 0.5],
    '剑气外放，攻击提高 22%/35%/50%（随阶）。'
  ),
  sword_intent: def(
    'sword_intent',
    '剑意通明',
    'sword',
    2,
    { kind: 'critDmgAdd' },
    [0.15, 0.3, 0.5],
    '剑意凌厉，暴击伤害提高 15%/30%/50%（随阶）。'
  ),
  sword_array: def(
    'sword_array',
    '万剑归宗',
    'sword',
    3,
    { kind: 'atkPct' },
    [0.35, 0.55, 0.8],
    '万剑齐鸣，攻击大幅提高 35%/55%/80%（随阶）。'
  ),

  // ── 雷法系：先手与速度 ──
  galeStride: def(
    'galeStride',
    '疾风步',
    'thunder',
    1,
    { kind: 'spdPct' },
    [0.15, 0.25, 0.4],
    '战斗中速度提高 15%/25%/40%（随阶）。'
  ),
  thunder_call: def(
    'thunder_call',
    '惊雷唤',
    'thunder',
    1,
    { kind: 'spdPct' },
    [0.12, 0.2, 0.32],
    '雷音催行，速度提高 12%/20%/32%（随阶）。'
  ),
  lightning_foot: def(
    'lightning_foot',
    '雷影步',
    'thunder',
    1,
    { kind: 'critAdd' },
    [0.03, 0.05, 0.08],
    '身如雷影，暴击率提高 3%/5%/8%（随阶）。'
  ),
  thunder_soul: def(
    'thunder_soul',
    '雷魂淬体',
    'thunder',
    2,
    { kind: 'spdPct' },
    [0.2, 0.32, 0.48],
    '雷魂入体，速度提高 20%/32%/48%（随阶）。'
  ),
  storm_eye: def(
    'storm_eye',
    '风雷之眼',
    'thunder',
    2,
    { kind: 'critAdd' },
    [0.05, 0.08, 0.12],
    '洞察战局，暴击率提高 5%/8%/12%（随阶）。'
  ),
  thunder_dao: def(
    'thunder_dao',
    '雷道天成',
    'thunder',
    3,
    { kind: 'spdPct' },
    [0.3, 0.45, 0.65],
    '雷道天成，速度大幅提高 30%/45%/65%（随阶）。'
  ),

  // ── 会心系：暴击流 ──
  keen_eye: def(
    'keen_eye',
    '锐目',
    'critical',
    1,
    { kind: 'critAdd' },
    [0.05, 0.08, 0.12],
    '战斗中暴击率提高 5%/8%/12%（随阶）。'
  ),
  kill_eye: def(
    'kill_eye',
    '破绽之眼',
    'critical',
    1,
    { kind: 'critAdd' },
    [0.04, 0.06, 0.1],
    '看破破绽，暴击率提高 4%/6%/10%（随阶）。'
  ),
  focus_charm: def(
    'focus_charm',
    '凝神符',
    'critical',
    1,
    { kind: 'critDmgAdd' },
    [0.1, 0.2, 0.35],
    '暴击伤害提高 10%/20%/35%（随阶）。'
  ),
  crit_heart: def(
    'crit_heart',
    '会心之心',
    'critical',
    2,
    { kind: 'critAdd' },
    [0.06, 0.1, 0.16],
    '会心一线，暴击率提高 6%/10%/16%（随阶）。'
  ),
  deadly_slot: def(
    'deadly_slot',
    '致命算计',
    'critical',
    2,
    { kind: 'critDmgAdd' },
    [0.2, 0.35, 0.55],
    '算无遗策，暴击伤害提高 20%/35%/55%（随阶）。'
  ),
  crit_dao: def(
    'crit_dao',
    '会心大道',
    'critical',
    3,
    { kind: 'critAdd' },
    [0.1, 0.16, 0.25],
    '一击必杀，暴击率大幅提高 10%/16%/25%（随阶）。'
  ),

  // ── 体修系：血防反伤 ──
  iron_wall: def(
    'iron_wall',
    '铁壁',
    'body',
    1,
    { kind: 'defPct' },
    [0.15, 0.25, 0.4],
    '战斗中防御提高 15%/25%/40%（随阶）。'
  ),
  jade_pulse: def(
    'jade_pulse',
    '玉脉',
    'body',
    1,
    { kind: 'hpPct' },
    [0.12, 0.2, 0.32],
    '战斗中最大生命提高 12%/20%/32%（随阶）。'
  ),
  ironBody: def(
    'ironBody',
    '铁骨生机',
    'body',
    1,
    { kind: 'layerHealPct' },
    [0.12, 0.18, 0.28],
    '每通过一层后，全队恢复 12%/18%/28% 最大生命（随阶）。'
  ),
  mountain_body: def(
    'mountain_body',
    '山岳体',
    'body',
    2,
    { kind: 'defPct' },
    [0.2, 0.32, 0.5],
    '身如山岳，防御提高 20%/32%/50%（随阶）。'
  ),
  thorn_shell: def(
    'thorn_shell',
    '棘甲反震',
    'body',
    2,
    { kind: 'thornsPct' },
    [0.1, 0.18, 0.3],
    '受击时反震 10%/18%/30% 伤害（随阶）。'
  ),
  immortal_body: def(
    'immortal_body',
    '不灭金身',
    'body',
    3,
    { kind: 'hpPct' },
    [0.25, 0.4, 0.6],
    '金身不灭，最大生命大幅提高 25%/40%/60%（随阶）。'
  ),

  // ── 御兽系：击杀回复与掉落 ──
  reaper_mark: def(
    'reaper_mark',
    '猎杀号令',
    'beast',
    1,
    { kind: 'healOnKill' },
    [0.1, 0.16, 0.25],
    '击杀敌人后恢复 10%/16%/25% 最大生命（随阶）。'
  ),
  golden_touch: def(
    'golden_touch',
    '聚宝',
    'beast',
    1,
    { kind: 'lootPct' },
    [0.2, 0.35, 0.55],
    '战斗掉落数量提高 20%/35%/55%（随阶）。'
  ),
  beast_heart: def(
    'beast_heart',
    '兽心同调',
    'beast',
    1,
    { kind: 'healOnKill' },
    [0.08, 0.12, 0.2],
    '与兽同心，击杀后恢复 8%/12%/20% 最大生命（随阶）。'
  ),
  hunt_master: def(
    'hunt_master',
    '狩猎大师',
    'beast',
    2,
    { kind: 'lootPct' },
    [0.3, 0.5, 0.75],
    '狩猎有获，掉落数量提高 30%/50%/75%（随阶）。'
  ),
  blood_fang: def(
    'blood_fang',
    '血牙',
    'beast',
    2,
    { kind: 'healOnKill' },
    [0.14, 0.22, 0.34],
    '血牙噬敌，击杀后恢复 14%/22%/34% 最大生命（随阶）。'
  ),
  beast_king: def(
    'beast_king',
    '兽王加冕',
    'beast',
    3,
    { kind: 'lootPct' },
    [0.5, 0.8, 1.2],
    '百兽朝王，掉落数量大幅提高 50%/80%/120%（随阶）。'
  ),

  // ── 灵息系：资源与续航 ──
  spirit_spring: def(
    'spirit_spring',
    '灵泉',
    'spirit',
    1,
    { kind: 'spiritRegen' },
    [5, 8, 12],
    '战斗中每回合恢复 5/8/12 点灵力（随阶）。'
  ),
  stoneHarvest: def(
    'stoneHarvest',
    '采石灵佑',
    'spirit',
    1,
    { kind: 'rewardPct', resource: 'spiritStone' },
    [0.3, 0.5, 0.8],
    '秘境灵石奖励提高 30%/50%/80%（随阶）。'
  ),
  verdantBounty: def(
    'verdantBounty',
    '木灵丰赐',
    'spirit',
    1,
    { kind: 'rewardPct', resource: 'herb' },
    [0.3, 0.5, 0.8],
    '秘境灵草奖励提高 30%/50%/80%（随阶）。'
  ),
  spirit_well: def(
    'spirit_well',
    '灵泉涌',
    'spirit',
    2,
    { kind: 'spiritRegen' },
    [8, 12, 18],
    '灵泉涌现，每回合恢复 8/12/18 点灵力（随阶）。'
  ),
  treasure_gath: def(
    'treasure_gath',
    '聚灵归仓',
    'spirit',
    2,
    { kind: 'rewardPct', resource: 'all' },
    [0.15, 0.25, 0.4],
    '秘境全部资源奖励提高 15%/25%/40%（随阶）。'
  ),
  spirit_dao: def(
    'spirit_dao',
    '灵息大道',
    'spirit',
    3,
    { kind: 'spiritRegen' },
    [12, 18, 26],
    '灵息绵绵不绝，每回合恢复 12/18/26 点灵力（随阶）。'
  ),
}

/** 全部祝福 id（PickBlessingOptions 池）。 */
export const ALL_BLESSING_IDS = Object.keys(BLESSING_DEFS) as BlessingId[]

// ── 旧版兼容导出（effectType 视图；现有测试与旧消费方使用） ──

export interface Blessing {
  id: BlessingId
  name: string
  description: string
  effectType: 'atkBoost' | 'critBoost' | 'spiritRegen' | 'hpBoost' | 'defBoost' | 'healOnKill' | 'lootBonus'
}

const EFFECT_TYPE_BY_KIND: Record<string, Blessing['effectType']> = {
  atkPct: 'atkBoost',
  defPct: 'defBoost',
  hpPct: 'hpBoost',
  critAdd: 'critBoost',
  critDmgAdd: 'critBoost',
  spiritRegen: 'spiritRegen',
  healOnKill: 'healOnKill',
  lootPct: 'lootBonus',
  layerHealPct: 'hpBoost',
  thornsPct: 'defBoost',
}

export const BLESSINGS: Blessing[] = ALL_BLESSING_IDS.map((id) => {
  const def = BLESSING_DEFS[id]
  return {
    id,
    name: def.name,
    description: def.description,
    effectType: EFFECT_TYPE_BY_KIND[def.effect.kind] ?? 'atkBoost',
  }
})

/** 祝福所属系查询。 */
export function getBlessingSchool(id: BlessingId): BlessingSchool {
  return BLESSING_DEFS[id].school
}

// ---------------------------------------------------------------------------
// 聚合：队列内同 id 计数 = 阶数（合成升阶的存储语义）
// ---------------------------------------------------------------------------

export interface AggregatedBlessingEffects {
  atkPct: number
  defPct: number
  spdPct: number
  hpPct: number
  critAdd: number
  critDmgAdd: number
  spiritRegen: number
  healOnKill: number
  lootPct: number
  layerHealPct: number
  thornsPct: number
  rewardPct: { spiritStone: number; herb: number; ore: number; all: number }
  /** 各系拥有数（协同词条与权重倾斜用）。 */
  schoolCounts: Record<BlessingSchool, number>
}

export function aggregateBlessingEffects(owned: BlessingId[]): AggregatedBlessingEffects {
  const result: AggregatedBlessingEffects = {
    atkPct: 0,
    defPct: 0,
    spdPct: 0,
    hpPct: 0,
    critAdd: 0,
    critDmgAdd: 0,
    spiritRegen: 0,
    healOnKill: 0,
    lootPct: 0,
    layerHealPct: 0,
    thornsPct: 0,
    rewardPct: { spiritStone: 0, herb: 0, ore: 0, all: 0 },
    schoolCounts: { sword: 0, thunder: 0, critical: 0, body: 0, beast: 0, spirit: 0 },
  }

  // 同 id 计数 = 阶（上限 3），每 id 只按其阶取值一次
  const tierOf = new Map<BlessingId, number>()
  for (const id of owned) {
    tierOf.set(id, Math.min(3, (tierOf.get(id) ?? 0) + 1))
  }

  for (const [id, tier] of tierOf) {
    const def = BLESSING_DEFS[id]
    if (!def) continue
    result.schoolCounts[def.school] += 1
    const value = def.values[tier - 1]
    switch (def.effect.kind) {
      case 'atkPct':
        result.atkPct += value
        break
      case 'defPct':
        result.defPct += value
        break
      case 'spdPct':
        result.spdPct += value
        break
      case 'hpPct':
        result.hpPct += value
        break
      case 'critAdd':
        result.critAdd += value
        break
      case 'critDmgAdd':
        result.critDmgAdd += value
        break
      case 'spiritRegen':
        result.spiritRegen += value
        break
      case 'healOnKill':
        result.healOnKill += value
        break
      case 'lootPct':
        result.lootPct += value
        break
      case 'layerHealPct':
        result.layerHealPct += value
        break
      case 'thornsPct':
        result.thornsPct += value
        break
      case 'rewardPct':
        if (def.effect.resource === 'all') {
          result.rewardPct.all += value
        } else {
          result.rewardPct[def.effect.resource] += value
        }
        break
    }
  }
  return result
}

/** 某祝福当前阶数（0 = 未拥有，上限 3）。 */
export function getBlessingTier(owned: BlessingId[], id: BlessingId): number {
  return Math.min(3, owned.filter((b) => b === id).length)
}

/** 祝福展示名（含阶标记：疾风步·贰）。 */
const TIER_MARKS = ['', '', '·贰', '·叁']
export function getBlessingDisplayName(id: BlessingId, tier: number): string {
  return `${BLESSING_DEFS[id].name}${TIER_MARKS[tier] ?? ''}`
}

// ---------------------------------------------------------------------------
// Build 协同词条（跨系统构筑：功法/装备/祝福组合）
// ---------------------------------------------------------------------------

export interface RunSynergyContext {
  /** 队伍已学功法总数（大道共鸣）。 */
  learnedTechniqueCount: number
  /** 队伍装备的剑类武器数（剑阵）。 */
  swordWeaponCount: number
}

export interface RunSynergyEffect {
  atkPct?: number
  hpPct?: number
  rewardPct?: number
}

export interface RunSynergyDef {
  id: string
  name: string
  description: string
  /** 返回 null 表示条件未满足；否则返回效果。 */
  evaluate: (owned: BlessingId[], context: RunSynergyContext) => RunSynergyEffect | null
}

export const RUN_SYNERGIES: RunSynergyDef[] = [
  {
    id: 'dao_resonance',
    name: '大道共鸣',
    description: '每已学功法，全队伤害 +8%',
    evaluate: (owned, ctx) => {
      if (owned.length === 0 || ctx.learnedTechniqueCount === 0) return null
      return { atkPct: 0.08 * ctx.learnedTechniqueCount }
    },
  },
  {
    id: 'sword_formation',
    name: '剑阵',
    description: '装备剑类武器 ≥3 时，全队攻击 +30%',
    evaluate: (owned, ctx) => {
      if (owned.length === 0 || ctx.swordWeaponCount < 3) return null
      return { atkPct: 0.3 }
    },
  },
  {
    id: 'beast_unity',
    name: '御兽同心',
    description: '拥有 ≥3 条御兽系祝福时，全队生命 +15%',
    evaluate: (owned) => {
      const count = new Set(owned.filter((id) => BLESSING_DEFS[id]?.school === 'beast')).size
      if (count < 3) return null
      return { hpPct: 0.15 }
    },
  },
  {
    id: 'alchemy_path',
    name: '丹道守恒',
    description: '灵息与会心系祝福各 ≥2 时，秘境资源奖励 +10%',
    evaluate: (owned) => {
      const countBy = (school: BlessingSchool) =>
        new Set(owned.filter((id) => BLESSING_DEFS[id]?.school === school)).size
      if (countBy('spirit') < 2 || countBy('critical') < 2) return null
      return { rewardPct: 0.1 }
    },
  },
]

/** 汇总全部满足条件的协同效果。 */
export function aggregateRunSynergies(
  owned: BlessingId[],
  context: RunSynergyContext
): { atkPct: number; hpPct: number; rewardPct: number; active: RunSynergyDef[] } {
  const result = { atkPct: 0, hpPct: 0, rewardPct: 0, active: [] as RunSynergyDef[] }
  for (const synergy of RUN_SYNERGIES) {
    const effect = synergy.evaluate(owned, context)
    if (effect) {
      result.atkPct += effect.atkPct ?? 0
      result.hpPct += effect.hpPct ?? 0
      result.rewardPct += effect.rewardPct ?? 0
      result.active.push(synergy)
    }
  }
  return result
}
