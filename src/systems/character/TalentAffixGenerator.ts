import type { CharacterQuality } from '../../types/character'
import type {
  TalentAffixInstance,
  TalentAffixRarity,
  TalentAffix,
  TalentAffixEffect,
  ResolvedAffixEffect,
} from '../../types/talent'
import { TALENT_AFFIXES } from '../../data/talentAffixes'

const AFFIX_CONFIG: Record<
  CharacterQuality,
  {
    prefixChance: number
    prefixRarities: TalentAffixRarity[]
    suffixChance: number
    suffixRarities: TalentAffixRarity[]
  }
> = {
  common: {
    prefixChance: 0.6,
    prefixRarities: ['common'],
    suffixChance: 0.3,
    suffixRarities: ['common'],
  },
  spirit: {
    prefixChance: 0.5,
    prefixRarities: ['common', 'rare'],
    suffixChance: 0.4,
    suffixRarities: ['common', 'rare'],
  },
  immortal: {
    prefixChance: 0.6,
    prefixRarities: ['common', 'rare', 'epic'],
    suffixChance: 0.5,
    suffixRarities: ['common', 'rare', 'epic'],
  },
  divine: {
    prefixChance: 0.7,
    prefixRarities: ['rare', 'epic', 'legendary'],
    suffixChance: 0.6,
    suffixRarities: ['rare', 'epic', 'legendary'],
  },
  chaos: {
    prefixChance: 0.8,
    prefixRarities: ['epic', 'legendary'],
    suffixChance: 0.7,
    suffixRarities: ['epic', 'legendary'],
  },
}

/** Roll prefix and/or suffix affix instances based on character quality. */
export function rollAffixes(quality: CharacterQuality): {
  prefix?: TalentAffixInstance
  suffix?: TalentAffixInstance
} {
  const config = AFFIX_CONFIG[quality]
  const result: { prefix?: TalentAffixInstance; suffix?: TalentAffixInstance } = {}

  if (Math.random() < config.prefixChance) {
    const pool = TALENT_AFFIXES.filter((a) => a.position === 'prefix' && config.prefixRarities.includes(a.rarity))
    if (pool.length > 0) {
      const affix = pool[Math.floor(Math.random() * pool.length)]
      result.prefix = resolveAffix(affix)
    }
  }

  if (Math.random() < config.suffixChance) {
    const pool = TALENT_AFFIXES.filter((a) => a.position === 'suffix' && config.suffixRarities.includes(a.rarity))
    if (pool.length > 0) {
      const affix = pool[Math.floor(Math.random() * pool.length)]
      result.suffix = resolveAffix(affix)
    }
  }

  return result
}

/** Resolve a TalentAffix definition into a TalentAffixInstance with rolled values. */
export function resolveAffix(affix: TalentAffix): TalentAffixInstance {
  return {
    affixId: affix.id,
    name: affix.name,
    position: affix.position,
    rarity: affix.rarity,
    description: affix.description,
    resolvedEffects: affix.effects.map(resolveEffect),
  }
}

function resolveEffect(eff: TalentAffixEffect): ResolvedAffixEffect {
  if (eff.type === 'flatStat') {
    const value = eff.minValue + Math.random() * (eff.maxValue - eff.minValue)
    return { type: eff.type, value: Math.round(value * 1000) / 1000, stat: eff.stat }
  }

  if (eff.type === 'elementDamage') {
    const value = eff.minValue + Math.random() * (eff.maxValue - eff.minValue)
    return { type: eff.type, value: Math.round(value * 1000) / 1000, element: eff.element }
  }

  if (eff.type === 'conditional') {
    const value = eff.effect.minValue + Math.random() * (eff.effect.maxValue - eff.effect.minValue)
    return {
      type: eff.type,
      value: Math.round(value * 1000) / 1000,
      trigger: eff.trigger,
      stat: eff.effect.stat,
      threshold: eff.threshold,
    }
  }

  if (eff.type === 'chance') {
    const value = eff.minValue + Math.random() * (eff.maxValue - eff.minValue)
    return { type: eff.type, value: Math.round(value * 1000) / 1000, stat: eff.effect.stat }
  }

  if (eff.type === 'modifier') {
    const value = eff.minValue + Math.random() * (eff.maxValue - eff.minValue)
    return { type: eff.type, value: Math.round(value * 1000) / 1000, target: eff.target }
  }

  // Should never reach here, but satisfy TypeScript
  return { type: 'flatStat', value: 0, stat: 'hp' }
}
