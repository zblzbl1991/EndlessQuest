import type { Equipment, ItemStats, EquipSlot } from '../../types/item'
import { getEnhanceRate, EQUIP_SLOTS } from '../../data/items'
import type { ItemQuality } from '../../types/item'

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

const QUALITY_MULT: Record<ItemQuality, number> = {
  common: 1,
  spirit: 1.8,
  immortal: 3,
  divine: 5,
  chaos: 8,
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
export function attemptEnhance(item: Equipment): EnhanceResult {
  const nextLevel = item.enhanceLevel + 1
  if (nextLevel > 15) {
    return { success: false, newLevel: item.enhanceLevel, cost: { spiritStone: 0, ore: 0 } }
  }

  const rate = getEnhanceRate(nextLevel)
  const qualityMult = QUALITY_MULT[item.quality]
  const cost = {
    spiritStone: Math.floor((nextLevel + 1) * qualityMult * 50),
    ore: Math.floor((nextLevel + 1) * qualityMult * 5),
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
export function refineEquipment(item: Equipment): RefineResult {
  const qualityMult = QUALITY_MULT[item.quality]
  const cost = { spiritStone: Math.floor(100 * qualityMult) }

  // Pick a random stat to refine
  const statKeys: (keyof ItemStats)[] = ['hp', 'atk', 'def', 'spd']
  const key = statKeys[Math.floor(Math.random() * statKeys.length)]

  // Refinement value = 30% of base stat at this quality
  const baseValue: Record<EquipSlot, Record<string, number>> = {
    head:      { hp: 15, atk: 0, def: 5, spd: 0 },
    armor:     { hp: 20, atk: 0, def: 8, spd: 0 },
    bracer:    { hp: 5,  atk: 3, def: 3, spd: 0 },
    belt:      { hp: 10, atk: 0, def: 4, spd: 2 },
    boots:     { hp: 5,  atk: 0, def: 2, spd: 5 },
    weapon:    { hp: 0,  atk: 8, def: 0, spd: 0 },
    accessory1:{ hp: 8,  atk: 2, def: 2, spd: 2 },
    accessory2:{ hp: 8,  atk: 2, def: 2, spd: 2 },
    talisman:  { hp: 10, atk: 5, def: 0, spd: 0 },
  }

  const value = Math.max(1, Math.floor(baseValue[item.slot][key] * qualityMult * 0.3))
  const newStat: Partial<ItemStats> = { [key]: value }

  return { success: true, newStat, cost }
}

/**
 * Calculate total base stats from all equipped gear
 */
export function calcEquipmentStats(
  equippedGear: (string | null)[],
  inventoryItems: Equipment[],
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

  return total
}

/**
 * Get the slot index for a given EquipSlot name
 */
export function getSlotIndex(slot: EquipSlot): number {
  return EQUIP_SLOTS.indexOf(slot)
}
