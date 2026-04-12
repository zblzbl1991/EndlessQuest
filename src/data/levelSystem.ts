import type { Character, CharacterQuality, GrowthMultipliers } from '../types/character'

export const QUALITY_LEVEL_STATS: Record<CharacterQuality, { hp: number; atk: number; def: number }> = {
  common: { hp: 2, atk: 1, def: 1 },
  spirit: { hp: 4, atk: 2, def: 2 },
  immortal: { hp: 6, atk: 3, def: 3 },
  divine: { hp: 8, atk: 4, def: 4 },
  chaos: { hp: 12, atk: 6, def: 6 },
}

export const REALM_LEVEL_CAPS = [10, 20, 30, 40, 50, 60] as const

export function getRealmLevelCap(realmIndex: number): number {
  return REALM_LEVEL_CAPS[realmIndex] ?? REALM_LEVEL_CAPS[0]
}

export function calcXpToNextLevel(level: number): number {
  return level * 100
}

export function getPerLevelStatBoost(
  quality: CharacterQuality,
  growthMultipliers?: Pick<GrowthMultipliers, 'hp' | 'atk' | 'def'>
): { hp: number; atk: number; def: number } {
  const perLevel = QUALITY_LEVEL_STATS[quality]
  const gm = growthMultipliers ?? { hp: 1, atk: 1, def: 1 }
  return {
    hp: Math.round(perLevel.hp * gm.hp),
    atk: Math.round(perLevel.atk * gm.atk),
    def: Math.round(perLevel.def * gm.def),
  }
}

export interface LevelUpResult {
  levelsGained: number
  xpRemaining: number
  statBoost: { hp: number; atk: number; def: number }
}

export function tryLevelUp(
  currentLevel: number,
  currentXp: number,
  xpGain: number,
  quality: CharacterQuality,
  realmIndex: number,
  growthMultipliers?: GrowthMultipliers
): LevelUpResult {
  const cap = getRealmLevelCap(realmIndex)
  const perLevel = QUALITY_LEVEL_STATS[quality]
  const gm = growthMultipliers ?? { hp: 1, atk: 1, def: 1 }
  let level = currentLevel
  let xp = currentXp + xpGain
  let levelsGained = 0
  let hp = 0,
    atk = 0,
    def = 0

  while (level < cap && xp >= calcXpToNextLevel(level)) {
    xp -= calcXpToNextLevel(level)
    level++
    levelsGained++
    hp += Math.round(perLevel.hp * gm.hp)
    atk += Math.round(perLevel.atk * gm.atk)
    def += Math.round(perLevel.def * gm.def)
  }

  return { levelsGained, xpRemaining: xp, statBoost: { hp, atk, def } }
}

export interface CharacterExperienceResult {
  character: Character
  xpGained: number
  levelsGained: number
  statBoost: { hp: number; atk: number; def: number }
}

export function applyCharacterExperience(character: Character, xpGain: number): CharacterExperienceResult {
  const safeLevel = Math.max(1, character.level ?? 1)
  const safeXp = Math.max(0, character.xp ?? 0)
  const normalizedXpGain = Math.max(0, Math.floor(xpGain))

  if (normalizedXpGain <= 0) {
    return {
      character: { ...character, level: safeLevel, xp: safeXp },
      xpGained: 0,
      levelsGained: 0,
      statBoost: { hp: 0, atk: 0, def: 0 },
    }
  }

  const levelResult = tryLevelUp(
    safeLevel,
    safeXp,
    normalizedXpGain,
    character.quality,
    character.realm,
    character.growthMultipliers
  )
  const realmCap = getRealmLevelCap(character.realm)
  const nextLevel = Math.min(realmCap, safeLevel + levelResult.levelsGained)
  const nextXp = nextLevel >= realmCap ? 0 : levelResult.xpRemaining

  return {
    character: {
      ...character,
      level: nextLevel,
      xp: nextXp,
      baseStats: {
        ...character.baseStats,
        hp: character.baseStats.hp + levelResult.statBoost.hp,
        atk: character.baseStats.atk + levelResult.statBoost.atk,
        def: character.baseStats.def + levelResult.statBoost.def,
      },
    },
    xpGained: normalizedXpGain,
    levelsGained: levelResult.levelsGained,
    statBoost: levelResult.statBoost,
  }
}
