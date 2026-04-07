import type { Equipment, EquipSlot, ItemQuality, ItemStats } from '../types/item'

// ---...--- Set Bonus Types ---...---

export interface SetBonus {
  description: string
  statMultipliers?: Partial<ItemStats>
  flatBonus?: Partial<ItemStats>
  special?: 'critBonus' | 'hpRegen' | 'spiritRegen' | 'aoeDamage'
  specialValue?: number
}

export interface EquipmentSet {
  id: string
  name: string
  description: string
  pieces: EquipSlot[]
  bonus2: SetBonus
  bonus4: SetBonus
}

// ---...--- Set Definitions ---...---

export const EQUIPMENT_SETS: EquipmentSet[] = [
  {
    id: 'azureBlade',
    name: '青锋套装',
    description: '以攻代守，锋芒毕露',
    pieces: ['weapon', 'bracer', 'talisman', 'boots'],
    bonus2: {
      description: '攻击+8%',
      statMultipliers: { atk: 0.08 },
    },
    bonus4: {
      description: '暴击+0.05，暴击伤害+0.15',
      flatBonus: { crit: 0.05, critDmg: 0.15 },
    },
  },
  {
    id: 'darkIron',
    name: '玄铁套装',
    description: '重甲如山，固若金汤',
    pieces: ['head', 'armor', 'belt', 'bracer'],
    bonus2: {
      description: '防御+10%，生命+5%',
      statMultipliers: { def: 0.1, hp: 0.05 },
    },
    bonus4: {
      description: '受到伤害-15%',
      special: 'hpRegen',
      specialValue: 0.15,
    },
  },
  {
    id: 'spiritLink',
    name: '灵犀套装',
    description: '灵气流转，身轻如燕',
    pieces: ['accessory1', 'accessory2', 'talisman', 'belt'],
    bonus2: {
      description: '速度+8%',
      statMultipliers: { spd: 0.08 },
    },
    bonus4: {
      description: '每回合灵力恢复+5',
      special: 'spiritRegen',
      specialValue: 5,
    },
  },
  {
    id: 'silkWeaver',
    name: '天蚕套装',
    description: '天蚕吐丝，绵延不绝',
    pieces: ['armor', 'boots', 'head', 'accessory1'],
    bonus2: {
      description: '生命+12%',
      statMultipliers: { hp: 0.12 },
    },
    bonus4: {
      description: '战后生命恢复+20%',
      special: 'hpRegen',
      specialValue: 0.2,
    },
  },
  {
    id: 'starShatter',
    name: '碎星套装',
    description: '星辰碎裂，一击必杀',
    pieces: ['weapon', 'talisman', 'accessory2', 'boots'],
    bonus2: {
      description: '攻击+5%，暴击+0.03',
      statMultipliers: { atk: 0.05 },
      flatBonus: { crit: 0.03 },
    },
    bonus4: {
      description: '暴击时10%概率双倍伤害',
      special: 'critBonus',
      specialValue: 0.1,
    },
  },
  {
    id: 'firmament',
    name: '苍穹套装',
    description: '包罗万象，万法归一',
    pieces: ['head', 'armor', 'bracer', 'belt', 'boots', 'weapon', 'accessory1', 'accessory2', 'talisman'],
    bonus2: {
      description: '全属性+3%',
      statMultipliers: { hp: 0.03, atk: 0.03, def: 0.03, spd: 0.03 },
    },
    bonus4: {
      description: '全属性+7%',
      statMultipliers: { hp: 0.07, atk: 0.07, def: 0.07, spd: 0.07 },
    },
  },
]

// ---...--- Set Lookup ---...---

const SET_BY_ID: Record<string, EquipmentSet> = {}
for (const set of EQUIPMENT_SETS) {
  SET_BY_ID[set.id] = set
}

export function getSetById(id: string): EquipmentSet | undefined {
  return SET_BY_ID[id]
}

// ---...--- Set Assignment ---...---

const SET_WEIGHTS: Record<ItemQuality, { noSet: number; hasSet: number }> = {
  common: { noSet: 85, hasSet: 15 },
  spirit: { noSet: 60, hasSet: 40 },
  immortal: { noSet: 30, hasSet: 70 },
  divine: { noSet: 10, hasSet: 90 },
  chaos: { noSet: 5, hasSet: 95 },
}

/**
 * Pick a set for the given slot and quality, or null if no set assigned.
 */
export function pickSetForSlot(slot: EquipSlot, quality: ItemQuality): EquipmentSet | null {
  const weights = SET_WEIGHTS[quality]
  const roll = Math.random() * 100

  if (roll < weights.noSet) return null

  const eligible = EQUIPMENT_SETS.filter((s) => s.pieces.includes(slot))
  if (eligible.length === 0) return null

  return eligible[Math.floor(Math.random() * eligible.length)]
}

// ---...--- Set Bonus Counting ---...---

/**
 * Count how many pieces of each set are currently equipped.
 */
export function countSetPieces(
  equippedGear: (string | null)[],
  getEquipmentById: (id: string) => Equipment | undefined
): Record<string, number> {
  const counts: Record<string, number> = {}

  for (const gearId of equippedGear) {
    if (!gearId) continue
    const item = getEquipmentById(gearId)
    if (item?.setId) {
      counts[item.setId] = (counts[item.setId] ?? 0) + 1
    }
  }

  return counts
}

/**
 * Calculate active set bonuses based on equipped gear.
 * Returns an array of active bonuses (2pc and/or 4pc for each set that qualifies).
 */
export function calcActiveSetBonuses(
  equippedGear: (string | null)[],
  getEquipmentById: (id: string) => Equipment | undefined
): SetBonus[] {
  const counts = countSetPieces(equippedGear, getEquipmentById)
  const bonuses: SetBonus[] = []

  for (const [setId, count] of Object.entries(counts)) {
    const set = SET_BY_ID[setId]
    if (!set) continue

    if (count >= 2) bonuses.push(set.bonus2)
    if (count >= 4) bonuses.push(set.bonus4)
  }

  return bonuses
}

/**
 * Calculate the total stats from all active set bonuses, given a base stat total.
 * Stat multipliers are applied to the provided base stats.
 */
export function calcSetBonusStats(
  baseStats: ItemStats,
  equippedGear: (string | null)[],
  getEquipmentById: (id: string) => Equipment | undefined
): ItemStats {
  const bonuses = calcActiveSetBonuses(equippedGear, getEquipmentById)

  let hp = 0
  let atk = 0
  let def = 0
  let spd = 0
  let crit = 0
  let critDmg = 0

  for (const bonus of bonuses) {
    if (bonus.statMultipliers) {
      const m = bonus.statMultipliers
      hp += Math.floor((baseStats.hp + hp) * (m.hp ?? 0))
      atk += Math.floor((baseStats.atk + atk) * (m.atk ?? 0))
      def += Math.floor((baseStats.def + def) * (m.def ?? 0))
      spd += Math.floor((baseStats.spd + spd) * (m.spd ?? 0))
    }
    if (bonus.flatBonus) {
      const f = bonus.flatBonus
      hp += f.hp ?? 0
      atk += f.atk ?? 0
      def += f.def ?? 0
      spd += f.spd ?? 0
      crit += f.crit ?? 0
      critDmg += f.critDmg ?? 0
    }
  }

  return {
    hp,
    atk,
    def,
    spd,
    crit: Math.round(crit * 1000) / 1000,
    critDmg: Math.round(critDmg * 100) / 100,
  }
}

// ---...--- Random Affix Generation ---...---

const AFFIX_STATS: (keyof ItemStats)[] = ['hp', 'atk', 'def', 'spd', 'crit', 'critDmg']

const AFFIX_COUNT_WEIGHTS: Record<ItemQuality, number[]> = {
  // [0 affix, 1 affix, 2 affix]
  common: [100, 0, 0],
  spirit: [60, 30, 10],
  immortal: [20, 50, 30],
  divine: [10, 30, 60],
  chaos: [0, 20, 80],
}

/**
 * Roll random affix count based on quality weights.
 */
function rollAffixCount(quality: ItemQuality): number {
  const weights = AFFIX_COUNT_WEIGHTS[quality]
  const roll = Math.random() * 100
  let cumulative = 0
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i]
    if (roll < cumulative) return i
  }
  return weights.length - 1
}

const AFFIX_QUALITY_MULT: Record<ItemQuality, number> = {
  common: 0,
  spirit: 0.08,
  immortal: 0.12,
  divine: 0.18,
  chaos: 0.25,
}

/**
 * Generate random affixes for equipment based on quality.
 * Returns an array of Partial<ItemStats> to be stored in refinementStats.
 */
export function generateRandomAffixes(
  quality: ItemQuality,
  _slot: EquipSlot,
  baseStats: ItemStats
): Partial<ItemStats>[] {
  const count = rollAffixCount(quality)
  if (count === 0) return []

  const affixes: Partial<ItemStats>[] = []
  const usedStats = new Set<keyof ItemStats>()

  for (let i = 0; i < count; i++) {
    // Pick a stat that hasn't been used yet for this item
    const available = AFFIX_STATS.filter((s) => !usedStats.has(s))
    if (available.length === 0) break

    const stat = available[Math.floor(Math.random() * available.length)]
    usedStats.add(stat)

    // Value = baseStat * qualityMult * random(0.5, 1.5), minimum 1 for integer stats
    const mult = AFFIX_QUALITY_MULT[quality]
    const randomFactor = 0.5 + Math.random()
    const rawValue = (baseStats[stat] || 5) * mult * randomFactor

    // crit and critDmg are decimal, others are integers
    const value =
      stat === 'crit' || stat === 'critDmg' ? Math.round(rawValue * 1000) / 1000 : Math.max(1, Math.floor(rawValue))

    affixes.push({ [stat]: value })
  }

  return affixes
}
