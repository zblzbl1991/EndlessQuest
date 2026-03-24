import type { ActiveSkill } from '../../types/skill'
import type { Technique, TechniqueBonus } from '../../types/technique'
import type { BaseStats, CultivationStats } from '../../types/character'

export interface TotalStatsResult {
  baseStats: BaseStats
  cultivationStats: CultivationStats
}

/**
 * Calculate total bonuses from technique growth modifiers and fixed bonuses
 */
export function calcTechniqueBonuses(
  technique: Technique | null,
  comprehension: number,
): Record<string, number> {
  const bonus: Record<string, number> = {}

  if (!technique) return bonus

  // Growth modifiers scaled by comprehension (0-100)
  const scale = Math.min(comprehension / 100, 1)
  for (const [stat, modifier] of Object.entries(technique.growthModifiers)) {
    if (modifier > 0) {
      bonus[stat] = (bonus[stat] ?? 0) + modifier * scale
    }
  }

  // Fixed bonuses based on comprehension thresholds
  const thresholds = [30, 70, 100]
  for (let i = 0; i < technique.fixedBonuses.length; i++) {
    const threshold = thresholds[i] ?? 100
    if (comprehension >= threshold) {
      const fb: TechniqueBonus = technique.fixedBonuses[i]
      bonus[fb.type] = (bonus[fb.type] ?? 0) + fb.value
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
