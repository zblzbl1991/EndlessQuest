import type { CharacterQuality } from '../../types/character'
import type { DestinySeedId, SectRiskPolicyId, DestinyAmplifierId } from '../../types/destiny'
import type { SectDarkCurrent } from '../../types/destiny'
import { getPolicyProfile } from '../../data/sectRiskPolicies'
import { getAmplifierProfile } from '../../data/destinyAmplifiers'
import { getDarkCurrentSeedWeight } from '../destiny/DarkCurrentSystem'

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

const SEED_RARITY_SCORES: Record<number, number> = {
  1: 6,
  2: 14,
  3: 24,
  4: 38,
  5: 56,
}

// ---------------------------------------------------------------------------
// Recruit candidate
// ---------------------------------------------------------------------------

export interface RecruitCandidate {
  quality: CharacterQuality
  seedId: DestinySeedId
  seedRarity: 1 | 2 | 3 | 4 | 5
  baseRisk: number
  specialtyUtilityScore: number
}

// ---------------------------------------------------------------------------
// Score a candidate
// ---------------------------------------------------------------------------

export function scoreRecruitCandidate(
  candidate: RecruitCandidate,
  policyId: SectRiskPolicyId,
  activeAmplifiers: DestinyAmplifierId[],
  darkCurrent: SectDarkCurrent
): number {
  const policy = getPolicyProfile(policyId)

  // Base quality score
  const qualityScore = QUALITY_SCORES[candidate.quality]

  // Seed rarity score with policy multiplier
  const seedRarityScore = (SEED_RARITY_SCORES[candidate.seedRarity] ?? 0) * policy.rareSeedMultiplier

  // Amplifier affinity: how well this seed matches active amplifiers
  let seedAmplifierAffinity = 0
  for (const ampId of activeAmplifiers) {
    const ampProfile = getAmplifierProfile(ampId)
    const bias = ampProfile.seedWeightBias[candidate.seedId] ?? 0
    seedAmplifierAffinity += bias
  }

  // Policy risk bias
  const policyRiskBias = candidate.baseRisk * (policy.highRiskRecruitBias / 20)

  // Dark current affinity
  const darkCurrentAffinity = getDarkCurrentSeedWeight(darkCurrent, candidate.seedId)

  // Risk penalty
  const baseRiskPenalty = candidate.baseRisk

  return (
    qualityScore +
    seedRarityScore +
    seedAmplifierAffinity +
    policyRiskBias +
    darkCurrentAffinity -
    baseRiskPenalty +
    candidate.specialtyUtilityScore
  )
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
  activeAmplifiers: DestinyAmplifierId[],
  darkCurrent: SectDarkCurrent,
  poolSize: number,
  maxPoolSize: number,
  lowestExistingScore: number
): AdmissionResult {
  const score = scoreRecruitCandidate(candidate, policyId, activeAmplifiers, darkCurrent)

  // Chaos quality + high risk: only aggressive policies
  if (candidate.quality === 'chaos' && candidate.baseRisk >= 70) {
    const allowedPolicies: SectRiskPolicyId[] = ['yapo', 'niejie', 'fenming']
    if (!allowedPolicies.includes(policyId)) {
      return { admitted: false, reason: '当前方针不宜接纳此等危险之人', score, isPriorityReserve: false }
    }
  }

  // Priority reserve for rare seeds matching amplifiers
  const isPriorityReserve =
    candidate.seedRarity >= 4 &&
    (() => {
      for (const ampId of activeAmplifiers) {
        const ampProfile = getAmplifierProfile(ampId)
        if ((ampProfile.seedWeightBias[candidate.seedId] ?? 0) > 0) return true
      }
      return false
    })()

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

  return { admitted: false, reason: '弟子池已满且无优势', score, isPriorityReserve }
}
