import type { ActiveSkill } from '../../types/skill'
import type { BaseStats, CultivationStats } from '../../types/character'
import { getTechniqueById } from '../../data/techniquesTable'

export interface TotalStatsResult {
  baseStats: BaseStats
  cultivationStats: CultivationStats
}

/**
 * Calculate total bonuses from all learned techniques.
 * Sums all technique bonuses (flat additive).
 */
export function calcTechniqueBonuses(
  learnedTechniques: string[],
): Record<string, number> {
  const bonus: Record<string, number> = {}

  for (const techId of learnedTechniques) {
    const technique = getTechniqueById(techId)
    if (!technique) continue
    for (const b of technique.bonuses) {
      bonus[b.type] = (bonus[b.type] ?? 0) + b.value
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
  techniqueBonuses: Record<string, number>,
): { baseStats: BaseStats; cultivationStats: CultivationStats } {
  const result = {
    baseStats: { ...baseStats },
    cultivationStats: { ...cultivationStats },
  }

  for (const [key, value] of Object.entries(techniqueBonuses)) {
    if (value === undefined || value === 0) continue
    if (key in result.baseStats) {
      (result.baseStats as unknown as Record<string, number>)[key] += value
    }
    if (key in result.cultivationStats) {
      (result.cultivationStats as unknown as Record<string, number>)[key] += value
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
