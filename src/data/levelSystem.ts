import type { CharacterQuality } from '../types/character'

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
  realmIndex: number
): LevelUpResult {
  const cap = getRealmLevelCap(realmIndex)
  const perLevel = QUALITY_LEVEL_STATS[quality]
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
    hp += perLevel.hp
    atk += perLevel.atk
    def += perLevel.def
  }

  return { levelsGained, xpRemaining: xp, statBoost: { hp, atk, def } }
}
