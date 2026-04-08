import type { Character } from '../../types/character'
import type { SectRiskPolicyId } from '../../types/destiny'
import { getPolicyProfile } from '../../data/sectRiskPolicies'
import { getFateGridDef } from '../../data/fateGrids'

// ---------------------------------------------------------------------------
// Fate grid rarity score bonus
// ---------------------------------------------------------------------------

const FATE_GRID_RARITY_SCORES: Record<string, number> = {
  common: 2,
  rare: 5,
  epic: 10,
  legendary: 15,
}

// ---------------------------------------------------------------------------
// Calculate core score for a character
// ---------------------------------------------------------------------------

export interface CoreScoreContext {
  dispositionAdventureScore: number
  dispositionRiskScore: number
  fateGridRarity: number // 0 = no grid, 2/5/10/15 based on rarity
  currentGearValue: number
  survivalHistoryScore: number
}

export function calculateCoreScore(ctx: CoreScoreContext, policyId: SectRiskPolicyId): number {
  const policy = getPolicyProfile(policyId)

  // Policy core bonus based on core focus weight
  const policyCoreBonus = (policy.coreFocusWeight - 1.0) * 20

  return (
    ctx.dispositionAdventureScore * 0.3 +
    ctx.dispositionRiskScore * 0.2 +
    ctx.fateGridRarity * 0.8 +
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
  getDispositonScore: (char: Character) => { adventure: number; risk: number },
  getGearValue: (char: Character) => number,
  getSurvivalHistory: (charId: string) => number
): CharacterCoreInfo[] {
  const policy = getPolicyProfile(policyId)

  const scored = characters
    .filter((c) => c.status !== 'injured' && c.status !== 'recovering')
    .map((char) => {
      const dispositions = getDispositonScore(char)

      // Derive fate grid rarity score
      let fateGridRarity = 0
      if (char.fateGrid) {
        const def = getFateGridDef(char.fateGrid)
        fateGridRarity = FATE_GRID_RARITY_SCORES[def.rarity] ?? 0
      }

      const coreScore = calculateCoreScore(
        {
          dispositionAdventureScore: dispositions.adventure,
          dispositionRiskScore: dispositions.risk,
          fateGridRarity,
          currentGearValue: getGearValue(char),
          survivalHistoryScore: getSurvivalHistory(char.id),
        },
        policyId
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
  getDispositonScore: (char: Character) => { adventure: number; risk: number },
  getGearValue: (char: Character) => number,
  getSurvivalHistory: (charId: string) => number
): string[] {
  const info = identifyCoreDisciples(characters, policyId, getDispositonScore, getGearValue, getSurvivalHistory)
  return info.filter((c) => c.isCore).map((c) => c.id)
}
