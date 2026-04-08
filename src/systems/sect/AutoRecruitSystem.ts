import type { CharacterQuality } from '../../types/character'
import type { SectRiskPolicyId, FateGridId } from '../../types/destiny'
import { getPolicyProfile } from '../../data/sectRiskPolicies'
import { getFateGridDef } from '../../data/fateGrids'

// ---------------------------------------------------------------------------
// Quality scores
// ---------------------------------------------------------------------------

const QUALITY_SCORES: Record<CharacterQuality, number> = {
  common: 8,
  spirit: 16,
  immortal: 28,
  divine: 44,
  chaos: 60,
}

const FATE_GRID_RARITY_SCORES: Record<string, number> = {
  common: 0,
  rare: 5,
  epic: 10,
  legendary: 15,
}

// ---------------------------------------------------------------------------
// Recruit candidate
// ---------------------------------------------------------------------------

export interface RecruitCandidate {
  quality: CharacterQuality
  fateGrid?: FateGridId
  baseRisk: number
  specialtyUtilityScore: number
}

// ---------------------------------------------------------------------------
// Score a candidate
// ---------------------------------------------------------------------------

export function scoreRecruitCandidate(candidate: RecruitCandidate, policyId: SectRiskPolicyId): number {
  const policy = getPolicyProfile(policyId)

  // Base quality score
  const qualityScore = QUALITY_SCORES[candidate.quality]

  // Fate grid rarity score
  const gridRarity = candidate.fateGrid ? getFateGridDef(candidate.fateGrid).rarity : null
  const gridRarityScore = gridRarity ? (FATE_GRID_RARITY_SCORES[gridRarity] ?? 0) : 0

  // Policy risk bias
  const policyRiskBias = candidate.baseRisk * (policy.highRiskRecruitBias / 20)

  // Risk penalty
  const baseRiskPenalty = candidate.baseRisk

  return qualityScore + gridRarityScore + policyRiskBias - baseRiskPenalty + candidate.specialtyUtilityScore
}

// ---------------------------------------------------------------------------
// Admission thresholds
// ---------------------------------------------------------------------------

export interface AdmissionResult {
  admitted: boolean
  reason: string
  score: number
  isPriorityReserve: boolean
}

export function evaluateAdmission(
  candidate: RecruitCandidate,
  policyId: SectRiskPolicyId,
  poolSize: number,
  maxPoolSize: number,
  lowestExistingScore: number
): AdmissionResult {
  const score = scoreRecruitCandidate(candidate, policyId)

  // Chaos quality + high risk: only aggressive policies
  if (candidate.quality === 'chaos' && candidate.baseRisk >= 70) {
    const allowedPolicies: SectRiskPolicyId[] = ['aggressive']
    if (!allowedPolicies.includes(policyId)) {
      return { admitted: false, reason: '当前方针不宜接纳此等危险之人', score, isPriorityReserve: false }
    }
  }

  // Priority reserve for legendary fate grids
  const isPriorityReserve =
    candidate.fateGrid !== undefined && getFateGridDef(candidate.fateGrid).rarity === 'legendary'

  // Pool not full: admit if score >= 22
  if (poolSize < maxPoolSize) {
    if (score >= 22 || isPriorityReserve) {
      return { admitted: true, reason: '录取入门', score, isPriorityReserve }
    }
    return { admitted: false, reason: '资质不足', score, isPriorityReserve: false }
  }

  // Pool full but has priority
  if (isPriorityReserve) {
    return { admitted: true, reason: '命格罕见，破格录取', score, isPriorityReserve }
  }

  // Pool full: replace if significantly better
  if (score > lowestExistingScore + 10) {
    return { admitted: true, reason: '替代末位弟子', score, isPriorityReserve: false }
  }

  return { admitted: false, reason: '弟子池已满且无优势', score, isPriorityReserve: false }
}
