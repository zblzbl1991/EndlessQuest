import type { Character } from '../../types/character'
import type { Equipment } from '../../types/item'
import type { SectRiskPolicyId } from '../../types/destiny'
import { getPolicyProfile } from '../../data/sectRiskPolicies'
import { getFateGridDef } from '../../data/fateGrids'

// ---------------------------------------------------------------------------
// Fate grid combat style mapping
// ---------------------------------------------------------------------------

const CATEGORY_STYLE_MAP: Record<string, 'burst' | 'tank' | 'control' | 'sacrifice' | 'summon'> = {
  heavenly: 'control',
  ghost: 'burst',
  emotional: 'burst',
  cultivation: 'control',
  probability: 'control',
}

function getFateGridCombatStyle(character: Character): 'burst' | 'tank' | 'control' | 'sacrifice' | 'summon' {
  if (!character.fateGrid) return 'burst'
  const def = getFateGridDef(character.fateGrid)
  return CATEGORY_STYLE_MAP[def.category] ?? 'burst'
}

// ---------------------------------------------------------------------------
// Equip fit scoring
// ---------------------------------------------------------------------------

export interface EquipFitContext {
  roleMatchScore: number
  destinyStyleMatch: number
  coreScore: number
  survivalNeedScore: number
  mutationSynergyScore: number
}

export function calculateEquipFitScore(ctx: EquipFitContext, policyId: SectRiskPolicyId): number {
  const policy = getPolicyProfile(policyId)

  return (
    ctx.roleMatchScore +
    ctx.destinyStyleMatch +
    ctx.coreScore * policy.coreFocusWeight +
    ctx.survivalNeedScore +
    ctx.mutationSynergyScore
  )
}

// ---------------------------------------------------------------------------
// Role match: how well equipment matches character's destiny style
// ---------------------------------------------------------------------------

export function calculateRoleMatch(equipment: Equipment, character: Character): number {
  const style = getFateGridCombatStyle(character)

  // Equipment stat bonus by style preference
  const stats = equipment.stats
  let score = 0

  switch (style) {
    case 'burst':
      score = (stats.atk ?? 0) * 1.2 + (stats.crit ?? 0) * 1.0 + (stats.spd ?? 0) * 0.6
      break
    case 'tank':
      score = (stats.hp ?? 0) * 1.2 + (stats.def ?? 0) * 1.2 + (stats.spd ?? 0) * 0.3
      break
    case 'control':
      score = (stats.spd ?? 0) * 1.2 + (stats.def ?? 0) * 0.8 + (stats.hp ?? 0) * 0.6
      break
    case 'sacrifice':
      score = (stats.atk ?? 0) * 1.5 + (stats.hp ?? 0) * 0.4 + (stats.crit ?? 0) * 0.8
      break
    case 'summon':
      score = (stats.hp ?? 0) * 0.8 + (stats.atk ?? 0) * 0.8 + (stats.def ?? 0) * 0.8 + (stats.spd ?? 0) * 0.8
      break
  }

  return Math.round(score)
}

// ---------------------------------------------------------------------------
// Sort equipment for a character by policy priority
// ---------------------------------------------------------------------------

export function sortEquipmentForCharacter(
  equipment: Equipment[],
  character: Character,
  policyId: SectRiskPolicyId,
  coreScore: number
): Equipment[] {
  const policy = getPolicyProfile(policyId)

  const scored = equipment.map((eq) => {
    const roleMatch = calculateRoleMatch(eq, character)
    const survivalNeed = character.status === 'injured' ? 20 : 0
    const fitScore = roleMatch + coreScore * policy.coreFocusWeight * 0.1 + survivalNeed

    return { equipment: eq, score: fitScore }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored.map((s) => s.equipment)
}

// ---------------------------------------------------------------------------
// Distribute equipment across characters by policy
// ---------------------------------------------------------------------------

export interface EquipAssignment {
  characterId: string
  equipmentId: string
  priority: number
}

export function distributeEquipment(
  available: Equipment[],
  characters: Character[],
  policyId: SectRiskPolicyId,
  coreScores: Map<string, number>
): EquipAssignment[] {
  const assignments: EquipAssignment[] = []
  const remaining = [...available]

  // Aggressive: core first
  // Steady: weakest first
  const isAggressive = policyId === 'aggressive'

  const sorted = [...characters].sort((a, b) => {
    const aCore = coreScores.get(a.id) ?? 0
    const bCore = coreScores.get(b.id) ?? 0
    return isAggressive ? bCore - aCore : aCore - bCore
  })

  for (const char of sorted) {
    if (remaining.length === 0) break

    const coreScore = coreScores.get(char.id) ?? 0
    const best = sortEquipmentForCharacter(remaining, char, policyId, coreScore)

    // Assign top equipment piece
    if (best.length > 0) {
      assignments.push({
        characterId: char.id,
        equipmentId: best[0].id,
        priority: isAggressive ? coreScore : 100 - coreScore,
      })
      const idx = remaining.findIndex((eq) => eq.id === best[0].id)
      if (idx >= 0) remaining.splice(idx, 1)
    }
  }

  return assignments
}
