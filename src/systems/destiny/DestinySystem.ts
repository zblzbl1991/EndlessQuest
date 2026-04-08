import type { FateGridId, FateGridEffects } from '../../types/destiny'
import type { Character, CharacterQuality } from '../../types/character'
import {
  getFateGridDef,
  shouldAcquireFateGrid,
  shouldBreakthroughActivateFateGrid,
  rollFateGrid,
} from '../../data/fateGrids'

// ---------------------------------------------------------------------------
// Query fate grid
// ---------------------------------------------------------------------------

export function getCharacterFateGrid(character: Character): FateGridId | undefined {
  return character.fateGrid
}

export function getCharacterFateGridEffects(character: Character): FateGridEffects | null {
  if (!character.fateGrid) return null
  return getFateGridDef(character.fateGrid).effects
}

// ---------------------------------------------------------------------------
// Fate grid acquisition
// ---------------------------------------------------------------------------

/** Try to assign a fate grid to a newly created character based on quality */
export function tryAcquireFateGrid(quality: CharacterQuality): FateGridId | undefined {
  if (!shouldAcquireFateGrid(quality)) return undefined
  return rollFateGrid(quality)
}

/** Try to activate a fate grid on major realm breakthrough */
export function tryBreakthroughFateGrid(quality: CharacterQuality): FateGridId | undefined {
  if (!shouldBreakthroughActivateFateGrid()) return undefined
  return rollFateGrid(quality)
}

// ---------------------------------------------------------------------------
// Effect query helpers (consumed by other systems)
// ---------------------------------------------------------------------------

export function getCultivationSpeedModifier(character: Character): number {
  const effects = getCharacterFateGridEffects(character)
  if (!effects) return 0
  return (effects.cultivationSpeedModifier ?? 0) - (effects.cultivationSpeedPenalty ?? 0)
}

export function getBreakthroughSuccessBonus(character: Character): number {
  const effects = getCharacterFateGridEffects(character)
  if (!effects) return 0
  return effects.breakthroughSuccessBonus ?? 0
}

export function getBreakthroughExpRetentionRate(character: Character): number {
  const effects = getCharacterFateGridEffects(character)
  if (!effects) return 0
  return effects.breakthroughExpRetentionRate ?? 0
}

export function getBreakthroughFailStackBonus(character: Character): number {
  const effects = getCharacterFateGridEffects(character)
  if (!effects) return 0
  return effects.breakthroughFailStackBonus ?? 0
}

export function getAttackModifier(character: Character): number {
  const effects = getCharacterFateGridEffects(character)
  if (!effects) return 0
  return effects.attackModifier ?? 0
}

export function getCritRateBonus(character: Character): number {
  const effects = getCharacterFateGridEffects(character)
  if (!effects) return 0
  return effects.critRateBonus ?? 0
}

export function getRareEventChanceBonus(character: Character): number {
  const effects = getCharacterFateGridEffects(character)
  if (!effects) return 0
  return effects.rareEventChanceBonus ?? 0
}

export function getLootQualityBonus(character: Character): number {
  const effects = getCharacterFateGridEffects(character)
  if (!effects) return 0
  return effects.lootQualityBonus ?? 0
}

export function getTechniqueComprehensionModifier(character: Character): number {
  const effects = getCharacterFateGridEffects(character)
  if (!effects) return 0
  return effects.techniqueComprehensionModifier ?? 0
}

export function getSuddenInsightChance(character: Character): number {
  const effects = getCharacterFateGridEffects(character)
  if (!effects) return 0
  return effects.suddenInsightChance ?? 0
}

export function getHeartDemonBonus(character: Character): number {
  const effects = getCharacterFateGridEffects(character)
  if (!effects) return 0
  return effects.heartDemonBonus ?? 0
}
