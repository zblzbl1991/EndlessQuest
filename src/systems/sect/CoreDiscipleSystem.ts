import type { Character } from '../../types/character'
import type { SectRiskPolicyId, DestinyAmplifierId, DestinyStage } from '../../types/destiny'
import { getPolicyProfile } from '../../data/sectRiskPolicies'

// ---------------------------------------------------------------------------
// Core score stage bonus
// ---------------------------------------------------------------------------

const STAGE_SCORES: Record<DestinyStage, number> = {
  seed: 0,
  stirring: 10,
  formed: 26,
  mutated: 46,
  heavenmarked: 88,
}

// ---------------------------------------------------------------------------
// Calculate core score for a character
// ---------------------------------------------------------------------------

export interface CoreScoreContext {
  dispositionAdventureScore: number
  dispositionRiskScore: number
  seedRarity: number // 1-5
  destinyStage: DestinyStage | null
  currentGearValue: number
  survivalHistoryScore: number
}

export function calculateCoreScore(
  ctx: CoreScoreContext,
  policyId: SectRiskPolicyId,
  _activeAmplifiers: DestinyAmplifierId[]
): number {
  const policy = getPolicyProfile(policyId)

  const seedRarityScore = ctx.seedRarity * 12
  const stageScore = ctx.destinyStage ? STAGE_SCORES[ctx.destinyStage] : 0

  // Amplifier match: how well this character's seed matches current amplifiers
  const amplifierMatchScore = 0
  // (This is a simplified version; full matching done by DestinySystem)

  // Policy core bonus based on core focus weight
  const policyCoreBonus = (policy.coreFocusWeight - 1.0) * 20

  return (
    ctx.dispositionAdventureScore * 0.3 +
    ctx.dispositionRiskScore * 0.2 +
    seedRarityScore * 0.8 +
    stageScore +
    amplifierMatchScore +
    ctx.currentGearValue * 0.15 +
    ctx.survivalHistoryScore +
    policyCoreBonus
  )
}

// ---------------------------------------------------------------------------
// Identify core disciples from character list
// ---------------------------------------------------------------------------

export interface CharacterCoreInfo {
  id: string
  coreScore: number
  isCore: boolean
}

export function identifyCoreDisciples(
  characters: Character[],
  policyId: SectRiskPolicyId,
  activeAmplifiers: DestinyAmplifierId[],
  getDispositonScore: (char: Character) => { adventure: number; risk: number },
  getGearValue: (char: Character) => number,
  getSurvivalHistory: (charId: string) => number
): CharacterCoreInfo[] {
  const policy = getPolicyProfile(policyId)

  const scored = characters
    .filter((c) => c.status !== 'injured' && c.status !== 'recovering')
    .map((char) => {
      const dispositions = getDispositonScore(char)
      const coreScore = calculateCoreScore(
        {
          dispositionAdventureScore: dispositions.adventure,
          dispositionRiskScore: dispositions.risk,
          seedRarity: char.seedRarity ?? 1,
          destinyStage: char.destinyState?.stage ?? null,
          currentGearValue: getGearValue(char),
          survivalHistoryScore: getSurvivalHistory(char.id),
        },
        policyId,
        activeAmplifiers
      )
      return { id: char.id, coreScore }
    })
    .sort((a, b) => b.coreScore - a.coreScore)

  const maxCores = policy.maxCoreDisciples
  const coreIds = new Set(scored.slice(0, maxCores).map((s) => s.id))

  return scored.map((s) => ({
    ...s,
    isCore: coreIds.has(s.id),
  }))
}

// ---------------------------------------------------------------------------
// Convenience: just get the core IDs
// ---------------------------------------------------------------------------

export function getCoreDiscipleIds(
  characters: Character[],
  policyId: SectRiskPolicyId,
  activeAmplifiers: DestinyAmplifierId[],
  getDispositonScore: (char: Character) => { adventure: number; risk: number },
  getGearValue: (char: Character) => number,
  getSurvivalHistory: (charId: string) => number
): string[] {
  const info = identifyCoreDisciples(
    characters,
    policyId,
    activeAmplifiers,
    getDispositonScore,
    getGearValue,
    getSurvivalHistory
  )
  return info.filter((c) => c.isCore).map((c) => c.id)
}
