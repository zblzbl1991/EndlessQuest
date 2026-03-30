import type { ActiveSkill } from '../../types/skill'
import type { TacticalPreset } from '../../types/adventure'

interface AIContext {
  hpPercent: number
  spiritPower: number
  maxSpiritPower: number
  isBossFight: boolean
}

/** Select action based on tactical preset */
export function selectAction(
  skills: ActiveSkill[],
  cooldowns: Record<string, number>,
  context: AIContext,
  preset: TacticalPreset
): ActiveSkill | null {
  const available = skills.filter((s) => (cooldowns[s.id] ?? 0) <= 0 && context.spiritPower >= s.spiritCost)

  switch (preset) {
    case 'conservative': {
      // HP < 40%: prefer defense/support skills
      if (context.hpPercent < 0.4) {
        const defensive = available.filter((s) => s.category === 'defense' || s.category === 'support')
        if (defensive.length > 0) return defensive[0]
      }
      return available.find((s) => s.category === 'attack') ?? available[0] ?? null
    }

    case 'burst': {
      // Prefer highest multiplier
      const attackSkills = available.filter((s) => s.category === 'attack' || s.category === 'ultimate')
      if (attackSkills.length > 0) return attackSkills.reduce((a, b) => (a.multiplier >= b.multiplier ? a : b))
      return available[0] ?? null
    }

    case 'bossCounter': {
      // Save resources for boss, use basic attacks on non-boss
      if (!context.isBossFight) return null // use normal attack
      const strong = available.filter((s) => s.category === 'ultimate' || s.multiplier >= 2.0)
      return strong[0] ?? available[0] ?? null
    }

    case 'balanced':
    default: {
      // Use first available skill by tier, fall back to attack
      return available.find((s) => s.category === 'attack') ?? available[0] ?? null
    }
  }
}
