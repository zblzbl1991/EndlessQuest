import type { EnemyAffix } from '../../types/adventure'

/** Apply berserk: if HP < 30%, boost atk by 50% */
export function applyBerserk(atk: number, hp: number, maxHp: number): number {
  if (hp / maxHp < 0.3) return Math.floor(atk * 1.5)
  return atk
}

/** Calculate initial shield from shield affix */
export function calcShield(maxHp: number, hasShield: boolean): number {
  return hasShield ? Math.floor(maxHp * 0.2) : 0
}

/** Calculate spirit drain heal */
export function calcSpiritDrainHeal(damage: number, hasSpiritDrain: boolean): number {
  return hasSpiritDrain ? Math.floor(damage * 0.1) : 0
}

/** Calculate swift extra turn (returns true every 3rd turn) */
export function shouldSwiftExtraTurn(turnNumber: number, hasSwift: boolean): boolean {
  return hasSwift && turnNumber > 0 && turnNumber % 3 === 0
}

/** Calculate tribulation bane bonus damage (ignores defense) */
export function calcTribulationBaneDamage(atk: number, hasTribulationBane: boolean): number {
  return hasTribulationBane ? Math.floor(atk * 0.05) : 0
}

/** Check if affix applies */
export function hasAffix(affixes: EnemyAffix[] | undefined, affix: EnemyAffix): boolean {
  return affixes?.includes(affix) ?? false
}
