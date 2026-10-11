/**
 * 装备机制词缀（V2.2 map 工单 03，设计稿 §十）。
 *
 * 与 refinementStats（纯数值精炼）互补：机制词条经 aggregateEquipmentAffixes
 * 聚合后进入战斗（吸血/反震/击杀吞灵/胜利回流）、修炼（速率乘区/熟练度加成）
 * 与属性百分比管线。阶位（tier 1-9）决定词条条数与数值档——品质 5 档保留，
 * 阶位为独立呈现轴（历史档按品质折算缺省 tier，零迁移）。
 */
import type { Equipment } from '../types/item'

export type EquipmentAffixEffect =
  | { kind: 'atkPct' }
  | { kind: 'defPct' }
  | { kind: 'hpPct' }
  | { kind: 'spdPct' }
  | { kind: 'critAdd' }
  | { kind: 'critDmgAdd' }
  | { kind: 'lifesteal' }
  | { kind: 'thorns' }
  | { kind: 'cultivationMult' }
  | { kind: 'devourKill' }
  | { kind: 'spiritFlow' }
  | { kind: 'masteryMult' }

export interface EquipmentAffixDef {
  id: string
  name: string
  description: string
  effect: EquipmentAffixEffect
  /** 按词条阶（1-3 档强度，映射装备阶位取值）的三档数值表。 */
  values: [number, number, number]
}

const def = (
  id: string,
  name: string,
  effect: EquipmentAffixEffect,
  values: [number, number, number],
  description: string
): EquipmentAffixDef => ({ id, name, effect, values, description })

export const EQUIPMENT_AFFIXES: EquipmentAffixDef[] = [
  // ── 属性百分比（折算进装备属性聚合）──
  def('aff_atk', '锋锐', { kind: 'atkPct' }, [0.05, 0.1, 0.18], '攻击提升 5%/10%/18%。'),
  def('aff_def', '磐石', { kind: 'defPct' }, [0.05, 0.1, 0.18], '防御提升 5%/10%/18%。'),
  def('aff_hp', '厚土', { kind: 'hpPct' }, [0.05, 0.1, 0.18], '生命提升 5%/10%/18%。'),
  def('aff_spd', '轻灵', { kind: 'spdPct' }, [0.04, 0.08, 0.15], '速度提升 4%/8%/15%。'),
  def('aff_crit', '会心', { kind: 'critAdd' }, [0.02, 0.04, 0.07], '暴击率提升 2%/4%/7%。'),
  def('aff_critdmg', '破军', { kind: 'critDmgAdd' }, [0.08, 0.15, 0.28], '暴击伤害提升 8%/15%/28%。'),
  // ── 机制词条（真实钩子）──
  def('aff_lifesteal', '饮血', { kind: 'lifesteal' }, [0.05, 0.1, 0.16], '造成伤害的 5%/10%/16% 转化为自身生命。'),
  def('aff_thorns', '棘刺', { kind: 'thorns' }, [0.08, 0.14, 0.25], '受击时反震 8%/14%/25% 伤害。'),
  def('aff_cultivation', '悟道', { kind: 'cultivationMult' }, [0.06, 0.12, 0.22], '佩戴者修炼速度提升 6%/12%/22%。'),
  def('aff_devour', '吞灵', { kind: 'devourKill' }, [2, 5, 10], '击杀敌人时吸纳灵韵，获得 2/5/10 修为。'),
  def('aff_spiritflow', '灵气回流', { kind: 'spiritFlow' }, [3, 6, 12], '战斗胜利后回流 3/6/12 点灵气。'),
  def('aff_mastery', '剑意', { kind: 'masteryMult' }, [0.1, 0.2, 0.35], '功法熟练度增长提升 10%/20%/35%。'),
  // ── 数值变体（不同曲线的组合词条，扩充池至 30+）──
  def('aff_atk2', '裂石', { kind: 'atkPct' }, [0.03, 0.07, 0.14], '攻击提升 3%/7%/14%。'),
  def('aff_def2', '铁骨', { kind: 'defPct' }, [0.03, 0.07, 0.14], '防御提升 3%/7%/14%。'),
  def('aff_hp2', '龟息', { kind: 'hpPct' }, [0.03, 0.07, 0.14], '生命提升 3%/7%/14%。'),
  def('aff_spd2', '风行', { kind: 'spdPct' }, [0.03, 0.06, 0.12], '速度提升 3%/6%/12%。'),
  def('aff_crit2', '毒目', { kind: 'critAdd' }, [0.015, 0.03, 0.06], '暴击率提升 1.5%/3%/6%。'),
  def('aff_critdmg2', '噬心', { kind: 'critDmgAdd' }, [0.06, 0.12, 0.22], '暴击伤害提升 6%/12%/22%。'),
  def('aff_lifesteal2', '汲取', { kind: 'lifesteal' }, [0.03, 0.07, 0.12], '造成伤害的 3%/7%/12% 转化为生命。'),
  def('aff_thorns2', '荆棘', { kind: 'thorns' }, [0.05, 0.1, 0.18], '受击时反震 5%/10%/18% 伤害。'),
  def('aff_cultivation2', '静修', { kind: 'cultivationMult' }, [0.04, 0.08, 0.16], '佩戴者修炼速度提升 4%/8%/16%。'),
  def('aff_devour2', '噬灵', { kind: 'devourKill' }, [1, 3, 7], '击杀敌人时获得 1/3/7 修为。'),
  def('aff_spiritflow2', '灵息吐纳', { kind: 'spiritFlow' }, [2, 4, 9], '战斗胜利后回流 2/4/9 点灵气。'),
  def('aff_mastery2', '参悟', { kind: 'masteryMult' }, [0.07, 0.14, 0.26], '功法熟练度增长提升 7%/14%/26%。'),
  def('aff_atk3', '龙吟', { kind: 'atkPct' }, [0.04, 0.09, 0.16], '攻击提升 4%/9%/16%。'),
  def('aff_hp3', '灵龟甲', { kind: 'hpPct' }, [0.04, 0.09, 0.16], '生命提升 4%/9%/16%。'),
  def('aff_def3', '玄铁衬', { kind: 'defPct' }, [0.04, 0.09, 0.16], '防御提升 4%/9%/16%。'),
  def('aff_spd3', '燕翎', { kind: 'spdPct' }, [0.025, 0.05, 0.11], '速度提升 2.5%/5%/11%。'),
  def('aff_crit3', '星芒', { kind: 'critAdd' }, [0.018, 0.035, 0.065], '暴击率提升 1.8%/3.5%/6.5%。'),
  def('aff_lifesteal3', '血契', { kind: 'lifesteal' }, [0.04, 0.08, 0.14], '造成伤害的 4%/8%/14% 转化为生命。'),
  def('aff_devour3', '吞天', { kind: 'devourKill' }, [1.5, 4, 8], '击杀敌人时获得 1.5/4/8 修为。'),
]

export const EQUIPMENT_AFFIX_BY_ID = new Map(EQUIPMENT_AFFIXES.map((a) => [a.id, a]))

// ---------------------------------------------------------------------------
// 装备阶位（tier 1-9，独立于品质的呈现轴）
// ---------------------------------------------------------------------------

export const EQUIPMENT_TIER_NAMES = [
  '',
  '凡品',
  '灵品',
  '玄品',
  '地品',
  '天品',
  '仙品',
  '圣品',
  '混沌',
  '鸿蒙',
] as const

/** 品质 → 缺省阶位折算（历史档零迁移：不写 tier 时按品质呈现）。 */
export function tierFromQuality(quality: string): number {
  switch (quality) {
    case 'common':
      return 1
    case 'spirit':
      return 3
    case 'immortal':
      return 5
    case 'divine':
      return 7
    case 'chaos':
      return 9
    default:
      return 1
  }
}

/** 装备阶位 → 词条条数（设计稿 §十：词缀条数按品质 2/3/4/5/6）。 */
export function affixCountByTier(tier: number): number {
  const table = [0, 1, 1, 2, 2, 3, 3, 4, 5, 6]
  return table[Math.min(9, Math.max(1, Math.floor(tier)))]
}

/** 词条数值档：阶位 1-3 档取 values[0]，4-6 取 values[1]，7-9 取 values[2]。 */
export function affixValueSlot(tier: number): 0 | 1 | 2 {
  if (tier >= 7) return 2
  if (tier >= 4) return 1
  return 0
}

/** 按阶位随机 roll 词条（同 id 不重复；数值档随阶）。 */
export function rollEquipmentAffixes(tier: number, rng: () => number = Math.random): { id: string; tier: number }[] {
  const count = affixCountByTier(tier)
  const pool = [...EQUIPMENT_AFFIXES]
  const picked: { id: string; tier: number }[] = []
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length)
    const affix = pool.splice(idx, 1)[0]
    picked.push({ id: affix.id, tier })
  }
  return picked
}

// ---------------------------------------------------------------------------
// 聚合（角色装备 → 战斗/修炼管线）
// ---------------------------------------------------------------------------

export interface AggregatedEquipmentAffixes {
  atkPct: number
  defPct: number
  hpPct: number
  spdPct: number
  critAdd: number
  critDmgAdd: number
  lifesteal: number
  thorns: number
  cultivationMult: number
  devourOnKill: number
  spiritFlowOnVictory: number
  masteryMult: number
}

export function emptyEquipmentAffixAggregate(): AggregatedEquipmentAffixes {
  return {
    atkPct: 0,
    defPct: 0,
    hpPct: 0,
    spdPct: 0,
    critAdd: 0,
    critDmgAdd: 0,
    lifesteal: 0,
    thorns: 0,
    cultivationMult: 0,
    devourOnKill: 0,
    spiritFlowOnVictory: 0,
    masteryMult: 0,
  }
}

function itemTier(item: Equipment): number {
  return item.tier ?? tierFromQuality(item.quality)
}

/** 聚合角色已装备的全部词条（数值档按各自装备的阶位取）。 */
export function aggregateEquipmentAffixes(equipped: (Equipment | undefined | null)[]): AggregatedEquipmentAffixes {
  const agg = emptyEquipmentAffixAggregate()
  for (const item of equipped) {
    if (!item || item.type !== 'equipment') continue
    const slot = affixValueSlot(itemTier(item))
    for (const inst of item.affixes ?? []) {
      const def = EQUIPMENT_AFFIX_BY_ID.get(inst.id)
      if (!def) continue
      const value = def.values[Math.min(2, affixValueSlot(inst.tier ?? itemTier(item)))]
      void slot
      switch (def.effect.kind) {
        case 'atkPct':
          agg.atkPct += value
          break
        case 'defPct':
          agg.defPct += value
          break
        case 'hpPct':
          agg.hpPct += value
          break
        case 'spdPct':
          agg.spdPct += value
          break
        case 'critAdd':
          agg.critAdd += value
          break
        case 'critDmgAdd':
          agg.critDmgAdd += value
          break
        case 'lifesteal':
          agg.lifesteal += value
          break
        case 'thorns':
          agg.thorns += value
          break
        case 'cultivationMult':
          agg.cultivationMult += value
          break
        case 'devourKill':
          agg.devourOnKill += value
          break
        case 'spiritFlow':
          agg.spiritFlowOnVictory += value
          break
        case 'masteryMult':
          agg.masteryMult += value
          break
      }
    }
  }
  return agg
}

/** 装备描述的词缀后缀（ItemCard/详情最小可用展示）。 */
export function describeEquipmentAffixes(item: Equipment): string {
  const parts: string[] = []
  for (const inst of item.affixes ?? []) {
    const def = EQUIPMENT_AFFIX_BY_ID.get(inst.id)
    if (def) parts.push(def.name)
  }
  return parts.length > 0 ? `词条：${parts.join(' / ')}` : ''
}

/** 器灵等级：经验曲线 level = floor(sqrt(exp / 25))，上限 10。 */
export function spiritLevelFromExp(exp: number): number {
  return Math.min(10, Math.floor(Math.sqrt(Math.max(0, exp) / 25)))
}

/** 器灵加成：每级全属性 +2%（并入 getEffectiveStats 的乘区）。 */
export function spiritLevelBonus(level: number): number {
  return 1 + 0.02 * Math.max(0, level)
}
