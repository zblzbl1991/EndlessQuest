import type { Technique, ActiveSkill } from '../../types/skill'
import type { BaseStats, CultivationStats } from '../../types/player'

export interface TotalStatsResult {
  baseStats: BaseStats
  cultivationStats: CultivationStats
}

/**
 * Calculate total bonuses from all equipped techniques
 */
export function calcTechniqueBonuses(
  equippedTechniques: (string | null)[],
  getTechniqueById: (id: string) => Technique | undefined,
): Partial<BaseStats & CultivationStats> {
  const bonus: Partial<BaseStats & CultivationStats> = {}

  for (const techId of equippedTechniques) {
    if (!techId) continue
    const tech = getTechniqueById(techId)
    if (!tech) continue
    for (const [stat, value] of Object.entries(tech.statBonus)) {
      if (value !== undefined && value > 0) {
        const key = stat as keyof typeof bonus
        bonus[key] = (bonus[key] ?? 0) + value
      }
    }
  }

  return bonus
}

/**
 * Apply technique bonuses to base and cultivation stats
 */
export function applyTechniqueBonuses(
  baseStats: BaseStats,
  cultivationStats: CultivationStats,
  techniqueBonuses: Partial<BaseStats & CultivationStats>,
): { baseStats: BaseStats; cultivationStats: CultivationStats } {
  const result = {
    baseStats: { ...baseStats },
    cultivationStats: { ...cultivationStats },
  }

  const baseKeys = new Set(Object.keys(result.baseStats))
  const cultKeys = new Set(Object.keys(result.cultivationStats))

  for (const [key, value] of Object.entries(techniqueBonuses)) {
    if (value === undefined || value === 0) continue
    if (baseKeys.has(key)) {
      (result.baseStats as Record<string, number>)[key] += value
    }
    if (cultKeys.has(key)) {
      (result.cultivationStats as Record<string, number>)[key] += value
    }
  }

  return result
}

/**
 * Get skill info for display
 */
export function getSkillInfo(skill: ActiveSkill): {
  name: string
  category: string
  element: string
  cost: number
  cooldown: number
  multiplier: number
  tier: number
  description: string
} {
  return {
    name: skill.name,
    category: skill.category,
    element: skill.element,
    cost: skill.spiritCost,
    cooldown: skill.cooldown,
    multiplier: skill.multiplier,
    tier: skill.tier,
    description: skill.description,
  }
}
