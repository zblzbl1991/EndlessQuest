import type {
  DestinyState,
  DestinyStage,
  DestinyRiskLevel,
  DestinySeedId,
  DestinyAmplifierId,
  DestinyEventRecord,
} from '../../types/destiny'
import { DESTINY_STAGE_THRESHOLDS, DESTINY_RISK_THRESHOLDS } from '../../types/destiny'
import { getSeedDef } from '../../data/destinySeeds'
import { getPolicyProfile, getPolicyIndex } from '../../data/sectRiskPolicies'
import { getAmplifierProfile } from '../../data/destinyAmplifiers'
import type { SectRiskPolicyId } from '../../types/destiny'
import type { Character } from '../../types/character'

// ---------------------------------------------------------------------------
// Exposure gains per event type
// ---------------------------------------------------------------------------

export const EXPOSURE_GAINS = {
  highVarianceRoute: 8,
  destinyEvent: 12,
  highRiskCombatSurvival: 6,
  highRiskRunComplete: 15,
  highRiskRunFailSurvival: 10,
  coreEquipped: 6,
  steadyIdleDay: -4,
  darkCurrentCorrection: -3,
} as const

export type ExposureGainKey = keyof typeof EXPOSURE_GAINS

// ---------------------------------------------------------------------------
// Stage advancement
// ---------------------------------------------------------------------------

export function getStageFromExposure(exposure: number): DestinyStage {
  if (exposure >= DESTINY_STAGE_THRESHOLDS.heavenmarked.min) return 'heavenmarked'
  if (exposure >= DESTINY_STAGE_THRESHOLDS.mutated.min) return 'mutated'
  if (exposure >= DESTINY_STAGE_THRESHOLDS.formed.min) return 'formed'
  if (exposure >= DESTINY_STAGE_THRESHOLDS.stirring.min) return 'stirring'
  return 'seed'
}

export function getRiskLevelFromInstability(instability: number): DestinyRiskLevel {
  if (instability >= DESTINY_RISK_THRESHOLDS.calamity.min) return 'calamity'
  if (instability >= DESTINY_RISK_THRESHOLDS.danger.min) return 'danger'
  if (instability >= DESTINY_RISK_THRESHOLDS.drifting.min) return 'drifting'
  return 'safe'
}

// ---------------------------------------------------------------------------
// Create initial destiny state
// ---------------------------------------------------------------------------

export function createDestinyState(seedId: DestinySeedId): DestinyState {
  const seedDef = getSeedDef(seedId)
  return {
    seedId,
    stage: 'seed',
    exposure: 0,
    instability: seedDef.baseRisk,
    riskLevel: getRiskLevelFromInstability(seedDef.baseRisk),
    matchedAmplifiers: [],
    dominantStyle: seedDef.defaultCombatStyle,
  }
}

// ---------------------------------------------------------------------------
// Add exposure with policy multiplier
// ---------------------------------------------------------------------------

export function addExposure(state: DestinyState, gainKey: ExposureGainKey, policyId: SectRiskPolicyId): DestinyState {
  const policy = getPolicyProfile(policyId)
  const baseGain = EXPOSURE_GAINS[gainKey]
  const effectiveGain = baseGain * policy.mutationExposureMultiplier
  const newExposure = Math.max(0, state.exposure + effectiveGain)
  const newStage = getStageFromExposure(newExposure)
  return {
    ...state,
    exposure: newExposure,
    stage: newStage,
  }
}

// ---------------------------------------------------------------------------
// Check for stage transition events
// ---------------------------------------------------------------------------

export function checkStageTransition(
  prevState: DestinyState,
  newState: DestinyState,
  timestamp: number
): DestinyEventRecord | null {
  if (prevState.stage === newState.stage) return null

  const transitionMap: Record<string, DestinyEventRecord['type']> = {
    'seed->stirring': 'stage_advance',
    'stirring->formed': 'stage_advance',
    'formed->mutated': 'stage_advance',
    'mutated->heavenmarked': 'heavenmarked',
  }

  const key = `${prevState.stage}->${newState.stage}`
  const type = transitionMap[key]
  if (!type) return null

  const stageNames: Record<DestinyStage, string> = {
    seed: '命苗',
    stirring: '萌动',
    formed: '成格',
    mutated: '异变',
    heavenmarked: '天命',
  }

  return {
    type,
    characterId: '',
    timestamp,
    detail: `${stageNames[prevState.stage]} → ${stageNames[newState.stage]}`,
    before: { stage: prevState.stage, exposure: prevState.exposure },
    after: { stage: newState.stage, exposure: newState.exposure },
  }
}

// ---------------------------------------------------------------------------
// Instability changes
// ---------------------------------------------------------------------------

export function addInstability(state: DestinyState, delta: number): DestinyState {
  const newInstability = Math.max(0, state.instability + delta)
  const newRiskLevel = getRiskLevelFromInstability(newInstability)
  return {
    ...state,
    instability: newInstability,
    riskLevel: newRiskLevel,
  }
}

// ---------------------------------------------------------------------------
// Calculate matched amplifiers for a character's destiny seed
// ---------------------------------------------------------------------------

export function calculateMatchedAmplifiers(
  seedId: DestinySeedId,
  activeAmplifiers: DestinyAmplifierId[]
): DestinyAmplifierId[] {
  return activeAmplifiers.filter((ampId) => {
    const profile = getAmplifierProfile(ampId)
    return profile.seedWeightBias[seedId] !== undefined && profile.seedWeightBias[seedId]! > 0
  })
}

// ---------------------------------------------------------------------------
// Shock calculation on policy switch
// ---------------------------------------------------------------------------

export function calculateShock(
  prevPolicyId: SectRiskPolicyId,
  nextPolicyId: SectRiskPolicyId,
  state: DestinyState
): { shockImpact: number; events: DestinyEventRecord[] } {
  const prevIdx = getPolicyIndex(prevPolicyId)
  const nextIdx = getPolicyIndex(nextPolicyId)
  const gap = Math.abs(nextIdx - prevIdx)

  if (gap < 2) {
    return { shockImpact: 0, events: [] }
  }

  const stageBonus: Record<DestinyStage, number> = {
    seed: 0,
    stirring: 4,
    formed: 10,
    mutated: 18,
    heavenmarked: 24,
  }

  const shockValue = gap * 12
  const shockImpact = shockValue + stageBonus[state.stage] + state.instability * 0.2

  return { shockImpact, events: [] }
}

export function applyShockToState(
  state: DestinyState,
  shockImpact: number,
  timestamp: number
): { state: DestinyState; event: DestinyEventRecord | null } {
  if (shockImpact < 20) {
    return { state, event: null }
  }

  const instabilityGain = shockImpact >= 60 ? 24 : shockImpact >= 40 ? 16 : 8
  const newState = addInstability(state, instabilityGain)

  return {
    state: newState,
    event: {
      type: 'shock',
      characterId: '',
      timestamp,
      detail:
        shockImpact >= 60
          ? '命格剧烈震荡，大事件即将降临'
          : shockImpact >= 40
            ? '命格明显失稳，因果涟漪扩散'
            : '命格轻微波动',
      before: { instability: state.instability, riskLevel: state.riskLevel },
      after: { instability: newState.instability, riskLevel: newState.riskLevel },
    },
  }
}

// ---------------------------------------------------------------------------
// Tianming (天命降临) check
// ---------------------------------------------------------------------------

export const TIANMING_BASE_CHANCE = 0.0015

export const SEED_RARITY_TIANNMING_FACTOR: Record<number, number> = {
  1: 1.0,
  2: 1.2,
  3: 1.5,
  4: 2.0,
  5: 3.0,
}

export function checkTianming(character: Character, policyId: SectRiskPolicyId, darkCurrentResonance: number): boolean {
  const state = character.destinyState
  if (!state) return false

  // Must be at mutated stage
  if (state.stage !== 'mutated') return false

  // Must be danger or calamity risk
  if (state.riskLevel !== 'danger' && state.riskLevel !== 'calamity') return false

  // Policy must be aggressive enough
  const policyIdx = getPolicyIndex(policyId)
  if (policyIdx < 4) return false // Only yapo/niejie/fenming

  // Seed rarity factor
  const rarity = character.seedRarity ?? 1
  const rarityFactor = SEED_RARITY_TIANNMING_FACTOR[rarity] ?? 1.0

  // Policy multiplier
  const policy = getPolicyProfile(policyId)
  const chance = TIANMING_BASE_CHANCE * policy.tianmingChanceMultiplier * rarityFactor * darkCurrentResonance

  return Math.random() < chance
}

// ---------------------------------------------------------------------------
// Batch update destiny for multiple characters after a run
// ---------------------------------------------------------------------------

export interface RunDestinyUpdate {
  characterId: string
  exposureGain: number
  instabilityDelta: number
  stageAdvanced: boolean
  events: DestinyEventRecord[]
}

export function processRunDestinyUpdates(
  characters: Character[],
  policyId: SectRiskPolicyId,
  activeAmplifiers: DestinyAmplifierId[],
  runVariance: 'low' | 'medium' | 'high',
  timestamp: number
): RunDestinyUpdate[] {
  const results: RunDestinyUpdate[] = []
  const policy = getPolicyProfile(policyId)

  for (const char of characters) {
    const state = char.destinyState
    if (!state) {
      results.push({
        characterId: char.id,
        exposureGain: 0,
        instabilityDelta: 0,
        stageAdvanced: false,
        events: [],
      })
      continue
    }

    // Base exposure from run variance
    const varianceGain = runVariance === 'high' ? EXPOSURE_GAINS.highRiskRunComplete : runVariance === 'medium' ? 8 : 4
    const effectiveGain = varianceGain * policy.mutationExposureMultiplier
    const newExposure = Math.max(0, state.exposure + effectiveGain)
    const newStage = getStageFromExposure(newExposure)

    // Instability from amplifier tags
    let instabilityDelta = 0
    for (const ampId of activeAmplifiers) {
      const ampProfile = getAmplifierProfile(ampId)
      instabilityDelta += ampProfile.instabilityGain
    }

    // Amplifier instability is per-run, scale down
    instabilityDelta = Math.round(instabilityDelta / 3)

    const newInstability = Math.max(0, state.instability + instabilityDelta)
    const newRiskLevel = getRiskLevelFromInstability(newInstability)

    const newState: DestinyState = {
      ...state,
      exposure: newExposure,
      stage: newStage,
      instability: newInstability,
      riskLevel: newRiskLevel,
      matchedAmplifiers: calculateMatchedAmplifiers(state.seedId, activeAmplifiers),
    }

    // Check stage transition
    const stageEvent = checkStageTransition(state, newState, timestamp)

    const events: DestinyEventRecord[] = []
    if (stageEvent) {
      stageEvent.characterId = char.id
      events.push(stageEvent)
    }

    results.push({
      characterId: char.id,
      exposureGain: effectiveGain,
      instabilityDelta,
      stageAdvanced: state.stage !== newStage,
      events,
    })
  }

  return results
}
