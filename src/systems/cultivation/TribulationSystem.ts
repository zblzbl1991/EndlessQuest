import type { Character } from '../../types/character'
import { REALMS, REALM_EXP } from '../../data/realms'
import { getHeartDemonBonus, getBreakthroughSuccessBonus } from '../destiny/DestinySystem'

export interface TribulationResult {
  success: boolean
  severe?: boolean
  injuryTimer?: number
}

/**
 * 天劫在每个大境界突破（stage 3 → 下一境）都会降临（设计稿 §5.4）。
 * 旧实现只检查目标境界的 tribulationPower 字段，导致 →筑基 零风险、
 * 高境数据成为死数据——现在天劫由统一的失败率公式驱动，不再依赖该字段。
 */
export function shouldTriggerTribulation(realm: number, realmStage: number): boolean {
  if (realmStage !== 3) return false
  return realm + 1 < REALMS.length
}

/**
 * 天劫失败率（设计稿 §5.4）：
 *   0.15 + 目标境 EXP × 0.004 − 灵根 × 0.005 − 悟性 × 0.003 − 命格/飞升树加成 + 心魔
 * 钳制在 [0, 0.95]。
 */
export function calcTribulationFailRate(character: Character, legacyBonus: number = 0): number {
  const targetRealm = character.realm + 1
  const exp = REALM_EXP[Math.min(Math.max(targetRealm, 0), REALM_EXP.length - 1)] ?? 0
  const base = 0.15 + exp * 0.004
  const attrs = character.cultivationStats.spiritualRoot * 0.005 + character.cultivationStats.comprehension * 0.003
  const destinyBonus = getBreakthroughSuccessBonus(character)
  const fateModifier = getHeartDemonBonus(character)
  return Math.min(0.95, Math.max(0, base - attrs - destinyBonus - legacyBonus + fateModifier))
}

/**
 * Resolve tribulation outcome for a character attempting major realm breakthrough.
 * This roll IS the breakthrough's success roll — callers must not stack a
 * second failure roll on top of it.
 */
export function resolveTribulation(character: Character, legacyBonus: number = 0): TribulationResult {
  const failRate = calcTribulationFailRate(character, legacyBonus)

  if (Math.random() >= failRate) {
    return { success: true }
  }

  // Failure: 10% chance of severe outcome
  const severe = Math.random() < 0.1
  return {
    success: false,
    severe,
    injuryTimer: severe ? 120 : 60,
  }
}
