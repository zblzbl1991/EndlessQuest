import type { CharacterQuality, GrowthMultipliers } from '../../types/character'

const GROWTH_CONFIG: Record<CharacterQuality, { min: number; max: number; sumMin: number; sumMax: number }> = {
  common: { min: 0.6, max: 1.3, sumMin: 4.0, sumMax: 6.5 },
  spirit: { min: 0.6, max: 1.4, sumMin: 4.5, sumMax: 7.0 },
  immortal: { min: 0.6, max: 1.5, sumMin: 5.0, sumMax: 7.5 },
  divine: { min: 0.7, max: 1.6, sumMin: 5.5, sumMax: 8.0 },
  chaos: { min: 0.8, max: 1.7, sumMin: 6.0, sumMax: 8.5 },
}

const GROWTH_KEYS = ['hp', 'atk', 'def', 'spd', 'crit', 'critDmg'] as const

function toGrowthMultipliers(values: number[]): GrowthMultipliers {
  const result: GrowthMultipliers = { hp: 0, atk: 0, def: 0, spd: 0, crit: 0, critDmg: 0 }
  GROWTH_KEYS.forEach((key, i) => {
    result[key] = Math.round(values[i] * 100) / 100
  })
  return result
}

function rollValues(config: { min: number; max: number }): number[] {
  return GROWTH_KEYS.map(() => config.min + Math.random() * (config.max - config.min))
}

export function generateGrowthMultipliers(quality: CharacterQuality): GrowthMultipliers {
  const config = GROWTH_CONFIG[quality]
  const MAX_ATTEMPTS = 10

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const values = rollValues(config)
    const sum = values.reduce((a, b) => a + b, 0)

    if (sum >= config.sumMin && sum <= config.sumMax) {
      return toGrowthMultipliers(values)
    }
  }

  // Fallback: use last generated values
  return toGrowthMultipliers(rollValues(config))
}

export function getDefaultGrowthMultipliers(): GrowthMultipliers {
  return { hp: 1, atk: 1, def: 1, spd: 1, crit: 1, critDmg: 1 }
}
