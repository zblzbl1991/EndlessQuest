import type { Equipment, ItemStats, EquipSlot } from '../../types/item'
import { getEnhanceRate, EQUIP_SLOTS } from '../../data/items'
import { calcSetBonusStats } from '../../data/equipmentSets'
import type { ItemQuality } from '../../types/item'
import type { Character, CultivationPath, SpecialtyType } from '../../types/character'

export interface EnhanceResult {
  success: boolean
  newLevel: number
  cost: { spiritStone: number; ore: number }
}

export interface RefineResult {
  success: boolean
  newStat: Partial<ItemStats>
  cost: { spiritStone: number }
}

export type EquipmentFitStatus = 'recommended' | 'neutral' | 'notRecommended'

export interface EquipmentRecommendation {
  status: EquipmentFitStatus
  label: string
  direction: string
  summary: string
  focus: string
  score: number
  reasons: string[]
}

const QUALITY_MULT: Record<ItemQuality, number> = {
  common: 1,
  spirit: 1.8,
  immortal: 3,
  divine: 5,
  chaos: 8,
}

const PATH_SLOT_PREFERENCES: Record<CultivationPath, EquipSlot[]> = {
  none: ['weapon', 'armor', 'boots', 'talisman'],
  sword: ['weapon', 'boots', 'talisman'],
  body: ['armor', 'head', 'belt'],
  alchemy: ['talisman', 'accessory1', 'accessory2'],
  beast: ['boots', 'weapon', 'accessory1'],
  formation: ['armor', 'accessory1', 'accessory2', 'belt'],
  void: ['weapon', 'talisman', 'boots'],
}

const SPECIALTY_SLOT_BONUSES: Partial<Record<SpecialtyType, Partial<Record<EquipSlot, number>>>> = {
  combat: { weapon: 3, talisman: 2, boots: 1 },
  fortune: { accessory1: 2, accessory2: 2, talisman: 1 },
  comprehension: { talisman: 3, accessory1: 1, accessory2: 1 },
  leadership: { armor: 2, head: 2, belt: 1 },
  alchemy: { talisman: 2, accessory1: 2, accessory2: 2 },
  forging: { weapon: 2, armor: 1, bracer: 1 },
}

const PATH_FOCUS_NAMES: Record<CultivationPath, string> = {
  none: '通用',
  sword: '输出',
  body: '生存',
  alchemy: '续航',
  beast: '机动',
  formation: '均衡',
  void: '爆发',
}

const SLOT_FOCUS_NAMES: Record<EquipSlot, string> = {
  head: '防御',
  armor: '防御',
  bracer: '攻击',
  belt: '生存',
  boots: '速度',
  weapon: '输出',
  accessory1: '均衡',
  accessory2: '均衡',
  talisman: '输出',
}

/**
 * Calculate the effective stats of an equipment including enhancement bonus
 */
export function getEffectiveStats(item: Equipment): ItemStats {
  if (item.type !== 'equipment') {
    return { hp: 0, atk: 0, def: 0, spd: 0, crit: 0, critDmg: 0 }
  }

  const enhanceBonus = 1 + item.enhanceLevel * 0.05

  let stats: ItemStats = {
    hp: Math.floor(item.stats.hp * enhanceBonus),
    atk: Math.floor(item.stats.atk * enhanceBonus),
    def: Math.floor(item.stats.def * enhanceBonus),
    spd: Math.floor(item.stats.spd * enhanceBonus),
    crit: Math.round(item.stats.crit * enhanceBonus * 1000) / 1000,
    critDmg: Math.round(item.stats.critDmg * enhanceBonus * 100) / 100,
  }

  // Add refinement stats
  for (const ref of item.refinementStats) {
    stats = {
      hp: stats.hp + (ref.hp ?? 0),
      atk: stats.atk + (ref.atk ?? 0),
      def: stats.def + (ref.def ?? 0),
      spd: stats.spd + (ref.spd ?? 0),
      crit: Math.round((stats.crit + (ref.crit ?? 0)) * 1000) / 1000,
      critDmg: Math.round((stats.critDmg + (ref.critDmg ?? 0)) * 100) / 100,
    }
  }

  return stats
}

/**
 * Attempt to enhance equipment by 1 level
 */
export function attemptEnhance(item: Equipment, successBonus = 0, costReduction = 0): EnhanceResult {
  const nextLevel = item.enhanceLevel + 1
  if (nextLevel > 15) {
    return { success: false, newLevel: item.enhanceLevel, cost: { spiritStone: 0, ore: 0 } }
  }

  const rate = Math.min(1, getEnhanceRate(nextLevel) + successBonus)
  const qualityMult = QUALITY_MULT[item.quality]
  const costMult = 1 - costReduction
  const cost = {
    spiritStone: Math.floor((nextLevel + 1) * qualityMult * 50 * costMult),
    ore: Math.floor((nextLevel + 1) * qualityMult * 5 * costMult),
  }

  const success = Math.random() < rate
  return {
    success,
    newLevel: success ? nextLevel : item.enhanceLevel,
    cost,
  }
}

/**
 * Refine equipment -- add/replace a random bonus stat
 */
export function refineEquipment(item: Equipment, costReduction = 0): RefineResult {
  const qualityMult = QUALITY_MULT[item.quality]
  const costMult = 1 - costReduction
  const cost = { spiritStone: Math.floor(100 * qualityMult * costMult) }

  // Pick a random stat to refine
  const statKeys: (keyof ItemStats)[] = ['hp', 'atk', 'def', 'spd']
  const key = statKeys[Math.floor(Math.random() * statKeys.length)]

  // Refinement value = 30% of base stat at this quality
  const baseValue: Record<EquipSlot, Record<string, number>> = {
    head: { hp: 15, atk: 0, def: 5, spd: 0 },
    armor: { hp: 20, atk: 0, def: 8, spd: 0 },
    bracer: { hp: 5, atk: 3, def: 3, spd: 0 },
    belt: { hp: 10, atk: 0, def: 4, spd: 2 },
    boots: { hp: 5, atk: 0, def: 2, spd: 5 },
    weapon: { hp: 0, atk: 8, def: 0, spd: 0 },
    accessory1: { hp: 8, atk: 2, def: 2, spd: 2 },
    accessory2: { hp: 8, atk: 2, def: 2, spd: 2 },
    talisman: { hp: 10, atk: 5, def: 0, spd: 0 },
  }

  const value = Math.max(1, Math.floor(baseValue[item.slot][key] * qualityMult * 0.3))
  const newStat: Partial<ItemStats> = { [key]: value }

  return { success: true, newStat, cost }
}

function getEquipmentFocus(stats: ItemStats): { focus: string; score: number } {
  const attackScore = stats.atk * 2 + stats.crit * 120 + stats.critDmg * 40
  const defenseScore = stats.hp * 0.18 + stats.def * 3
  const speedScore = stats.spd * 4

  if (attackScore >= defenseScore && attackScore >= speedScore) {
    return { focus: '输出', score: attackScore }
  }
  if (defenseScore >= speedScore) {
    return { focus: '生存', score: defenseScore }
  }
  return { focus: '速度', score: speedScore }
}

function getPathPreferenceBonus(path: CultivationPath, slot: EquipSlot): number {
  const preferred = PATH_SLOT_PREFERENCES[path]
  if (preferred.includes(slot)) return 4
  if (path === 'formation' && slot === 'talisman') return 3
  if (path === 'body' && slot === 'belt') return 2
  return 0
}

function getSpecialtyBonus(character: Pick<Character, 'specialties'>, slot: EquipSlot): number {
  let score = 0
  for (const specialty of character.specialties) {
    score += SPECIALTY_SLOT_BONUSES[specialty.type]?.[slot] ?? 0
  }
  return score
}

function buildRecommendation(
  score: number,
  focus: string,
  pathName: string,
  slotName: string,
  reasons: string[]
): EquipmentRecommendation {
  if (score >= 8) {
    return {
      status: 'recommended',
      label: '推荐',
      direction: `${pathName}${focus}`,
      summary: `这件装备很适合当前弟子的${pathName}风格。`,
      focus,
      score,
      reasons,
    }
  }

  if (score <= 1) {
    return {
      status: 'notRecommended',
      label: '不推荐',
      direction: `${slotName}${focus}`,
      summary: `这件装备更像是${slotName}过渡件，和当前 build 的贴合度不高。`,
      focus,
      score,
      reasons,
    }
  }

  return {
    status: 'neutral',
    label: '可用',
    direction: `${pathName}${focus}`,
    summary: `这件装备能用，但不是当前 build 的最优解。`,
    focus,
    score,
    reasons,
  }
}

export function getEquipmentRecommendationForCharacter(
  character: Pick<Character, 'cultivationPath' | 'specialties' | 'fateTags'>,
  item: Equipment
): EquipmentRecommendation {
  const stats = getEffectiveStats(item)
  const slotName = SLOT_FOCUS_NAMES[item.slot]
  const pathName = PATH_FOCUS_NAMES[character.cultivationPath]
  const focus = getEquipmentFocus(stats)

  let score = 0
  const reasons: string[] = []

  score += getPathPreferenceBonus(character.cultivationPath, item.slot)
  if (score > 0) reasons.push(`契合${pathName}修行路线`)

  const specialtyBonus = getSpecialtyBonus(character, item.slot)
  if (specialtyBonus > 0) {
    score += specialtyBonus
    reasons.push('符合弟子专长方向')
  }

  if (focus.focus === '输出' && (item.slot === 'weapon' || item.slot === 'talisman' || item.slot === 'bracer')) {
    score += 3
    reasons.push('词条偏输出')
  } else if (focus.focus === '生存' && (item.slot === 'armor' || item.slot === 'head' || item.slot === 'belt')) {
    score += 3
    reasons.push('词条偏生存')
  } else if (focus.focus === '速度' && item.slot === 'boots') {
    score += 3
    reasons.push('词条偏速度')
  }

  if (focus.focus === '输出' && (item.slot === 'armor' || item.slot === 'head' || item.slot === 'belt')) {
    score -= 3
    reasons.push('输出向词条和防御位方向冲突')
  } else if (focus.focus === '生存' && (item.slot === 'weapon' || item.slot === 'talisman' || item.slot === 'bracer')) {
    score -= 2
    reasons.push('生存向词条和输出位不太匹配')
  } else if (focus.focus === '速度' && (item.slot === 'armor' || item.slot === 'head' || item.slot === 'belt')) {
    score -= 2
    reasons.push('速度向词条和重防位冲突')
  }

  if (character.fateTags.includes('suddenInsight') && item.slot === 'talisman') {
    score += 1
    reasons.push('顿悟型命格更吃法宝位')
  }
  if (character.fateTags.includes('stableDaoHeart') && (item.slot === 'armor' || item.slot === 'belt')) {
    score += 1
    reasons.push('道心稳固，适合稳扎稳打装备')
  }

  return buildRecommendation(score, focus.focus, pathName, slotName, reasons)
}

export function getEquipmentTendency(item: Equipment): EquipmentRecommendation {
  const stats = getEffectiveStats(item)
  const focus = getEquipmentFocus(stats)
  const slotName = SLOT_FOCUS_NAMES[item.slot]
  const reasons = [focus.focus === '输出' ? '攻击词条占优' : focus.focus === '生存' ? '防护词条占优' : '速度词条占优']

  let score = 4
  if (focus.focus === '输出') score += 2
  if (focus.focus === '生存') score += 1
  if (focus.focus === '速度') score += 1

  return buildRecommendation(score, focus.focus, '通用', slotName, reasons)
}

/**
 * Calculate total base stats from all equipped gear, including set bonuses
 */
export function calcEquipmentStats(
  equippedGear: (string | null)[],
  _inventoryItems: Equipment[],
  getEquipmentById: (id: string) => Equipment | undefined
): ItemStats {
  const total: ItemStats = { hp: 0, atk: 0, def: 0, spd: 0, crit: 0, critDmg: 0 }

  for (const gearId of equippedGear) {
    if (!gearId) continue
    const item = getEquipmentById(gearId)
    if (item && item.type === 'equipment') {
      const eff = getEffectiveStats(item)
      total.hp += eff.hp
      total.atk += eff.atk
      total.def += eff.def
      total.spd += eff.spd
      total.crit = Math.round((total.crit + eff.crit) * 1000) / 1000
      total.critDmg = Math.round((total.critDmg + eff.critDmg) * 100) / 100
    }
  }

  // Apply set bonuses on top of summed base stats
  const setBonus = calcSetBonusStats(total, equippedGear, getEquipmentById)
  total.hp += setBonus.hp
  total.atk += setBonus.atk
  total.def += setBonus.def
  total.spd += setBonus.spd
  total.crit = Math.round((total.crit + setBonus.crit) * 1000) / 1000
  total.critDmg = Math.round((total.critDmg + setBonus.critDmg) * 100) / 100

  return total
}

/**
 * Get the slot index for a given EquipSlot name
 */
export function getSlotIndex(slot: EquipSlot): number {
  return EQUIP_SLOTS.indexOf(slot)
}
