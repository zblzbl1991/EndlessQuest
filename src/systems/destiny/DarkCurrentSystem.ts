import type { SectDarkCurrent, DestinySeedId, SectRiskPolicyId } from '../../types/destiny'
import { getPolicyProfile } from '../../data/sectRiskPolicies'
import { getSeedDef } from '../../data/destinySeeds'
import { getAmplifierProfile } from '../../data/destinyAmplifiers'
import type { DestinyAmplifierId } from '../../types/destiny'

// ---------------------------------------------------------------------------
// Dark current level tiers
// ---------------------------------------------------------------------------

export type DarkCurrentTier = 'background' | 'perceptible' | 'significant' | 'strong'

export const DARK_CURRENT_TIERS: Record<DarkCurrentTier, { min: number; max: number }> = {
  background: { min: 0, max: 39 },
  perceptible: { min: 40, max: 79 },
  significant: { min: 80, max: 139 },
  strong: { min: 140, max: Infinity },
}

export function getDarkCurrentTier(value: number): DarkCurrentTier {
  if (value >= DARK_CURRENT_TIERS.strong.min) return 'strong'
  if (value >= DARK_CURRENT_TIERS.significant.min) return 'significant'
  if (value >= DARK_CURRENT_TIERS.perceptible.min) return 'perceptible'
  return 'background'
}

// ---------------------------------------------------------------------------
// Growth after a run
// ---------------------------------------------------------------------------

export interface RunDarkCurrentResult {
  darkCurrent: SectDarkCurrent
  totalGain: number
}

export function applyRunDarkCurrentGain(
  current: SectDarkCurrent,
  dominantSeedIds: DestinySeedId[],
  runVarianceScore: number,
  mutatedCoreCount: number,
  majorEventWeight: number,
  policyId: SectRiskPolicyId,
  activeAmplifiers: DestinyAmplifierId[]
): RunDarkCurrentResult {
  const policy = getPolicyProfile(policyId)

  // Calculate amplifier bias
  const ampBias = { ...current } as Record<string, number>
  for (const ampId of activeAmplifiers) {
    const ampProfile = getAmplifierProfile(ampId)
    for (const [family, bias] of Object.entries(ampProfile.darkCurrentBias)) {
      if (bias !== undefined && family in ampBias) {
        ampBias[family] = (ampBias[family] ?? 0) + bias
      }
    }
  }

  // Base gain per seed family
  let totalGain = 0
  const gains: Record<string, number> = {}

  for (const seedId of dominantSeedIds) {
    const seedDef = getSeedDef(seedId)
    const family = seedDef.darkCurrentFamily
    const baseGain = (runVarianceScore + mutatedCoreCount * 6 + majorEventWeight) * policy.darkCurrentGainMultiplier

    const gain = Math.round(baseGain / dominantSeedIds.length)
    gains[family] = (gains[family] ?? 0) + gain
    totalGain += gain
  }

  // Apply gains
  const newCurrent: SectDarkCurrent = {
    fortune: Math.max(0, current.fortune + (gains.fortune ?? 0)),
    tribulation: Math.max(0, current.tribulation + (gains.tribulation ?? 0)),
    abyss: Math.max(0, current.abyss + (gains.abyss ?? 0)),
    guardian: Math.max(0, current.guardian + (gains.guardian ?? 0)),
    plunder: Math.max(0, current.plunder + (gains.plunder ?? 0)),
    afterglow: Math.max(0, current.afterglow + (gains.afterglow ?? 0)),
    anomaly: Math.max(0, current.anomaly + (gains.anomaly ?? 0)),
    lastShiftAt: totalGain > 0 ? Date.now() : current.lastShiftAt,
  }

  return { darkCurrent: newCurrent, totalGain }
}

// ---------------------------------------------------------------------------
// Daily decay
// ---------------------------------------------------------------------------

export function applyDailyDecay(current: SectDarkCurrent, policyId: SectRiskPolicyId): SectDarkCurrent {
  const policy = getPolicyProfile(policyId)
  const decay = policy.darkCurrentDecayPerDay

  if (decay <= 0) return current // No decay for aggressive policies

  return {
    fortune: Math.max(0, current.fortune - decay),
    tribulation: Math.max(0, current.tribulation - decay),
    abyss: Math.max(0, current.abyss - decay),
    guardian: Math.max(0, current.guardian - decay),
    plunder: Math.max(0, current.plunder - decay),
    afterglow: Math.max(0, current.afterglow - decay),
    anomaly: Math.max(0, current.anomaly - decay),
    lastShiftAt: current.lastShiftAt,
  }
}

// ---------------------------------------------------------------------------
// Dark current resonance for tianming calculation
// ---------------------------------------------------------------------------

export function calculateDarkCurrentResonance(current: SectDarkCurrent, seedId: DestinySeedId): number {
  const seedDef = getSeedDef(seedId)
  const familyValue = current[seedDef.darkCurrentFamily]
  const tier = getDarkCurrentTier(familyValue)

  const resonanceMap: Record<DarkCurrentTier, number> = {
    background: 1.0,
    perceptible: 1.2,
    significant: 1.4,
    strong: 1.8,
  }

  return resonanceMap[tier]
}

// ---------------------------------------------------------------------------
// Get dominant dark current family (for display/recruit bias)
// ---------------------------------------------------------------------------

export function getDominantDarkCurrentFamily(
  current: SectDarkCurrent
): { family: keyof Omit<SectDarkCurrent, 'lastShiftAt'>; value: number; tier: DarkCurrentTier } | null {
  const families: (keyof Omit<SectDarkCurrent, 'lastShiftAt'>)[] = [
    'fortune',
    'tribulation',
    'abyss',
    'guardian',
    'plunder',
    'afterglow',
    'anomaly',
  ]

  let maxFamily: (typeof families)[number] | null = null
  let maxValue = 0

  for (const family of families) {
    if (current[family] > maxValue) {
      maxValue = current[family]
      maxFamily = family
    }
  }

  if (!maxFamily || maxValue < DARK_CURRENT_TIERS.perceptible.min) return null

  return {
    family: maxFamily,
    value: maxValue,
    tier: getDarkCurrentTier(maxValue),
  }
}

// ---------------------------------------------------------------------------
// Dark current seed weight bias for recruit scoring
// ---------------------------------------------------------------------------

export function getDarkCurrentSeedWeight(current: SectDarkCurrent, seedId: DestinySeedId): number {
  const seedDef = getSeedDef(seedId)
  const family = seedDef.darkCurrentFamily
  const value = current[family]
  const tier = getDarkCurrentTier(value)

  const weightMap: Record<DarkCurrentTier, number> = {
    background: 0,
    perceptible: 3,
    significant: 6,
    strong: 10,
  }

  return weightMap[tier]
}
