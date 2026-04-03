import type { Character, CultivationPath } from '../../types/character'
import type { SectRiskPolicyId, DestinySeedId, AutoCultivationProfile } from '../../types/destiny'
import { getPolicyProfile } from '../../data/sectRiskPolicies'

// ---------------------------------------------------------------------------
// Seed combat style mapping
// ---------------------------------------------------------------------------

const SEED_STYLE_MAP: Record<DestinySeedId, 'burst' | 'tank' | 'control' | 'sacrifice' | 'summon'> = {
  fortuneSeed: 'control',
  tribulationSeed: 'burst',
  abyssSeed: 'sacrifice',
  guardianSeed: 'tank',
  plunderSeed: 'burst',
  afterglowSeed: 'burst',
  anomalySeed: 'summon',
}

// ---------------------------------------------------------------------------
// Generate cultivation profile
// ---------------------------------------------------------------------------

export function generateCultivationProfile(character: Character, policyId: SectRiskPolicyId): AutoCultivationProfile {
  const policy = getPolicyProfile(policyId)
  const seedId = character.seedId ?? character.destinyState?.seedId
  const seedStyle = seedId ? (SEED_STYLE_MAP[seedId] ?? 'burst') : 'burst'

  // Determine preferred style: seed style first, then policy preference
  const preferredStyle = seedStyle

  // Base stat weights by style
  const baseWeights: Record<string, AutoCultivationProfile['statWeights']> = {
    burst: { hp: 0.6, atk: 1.5, def: 0.5, spd: 1.2, crit: 1.3 },
    tank: { hp: 1.5, atk: 0.6, def: 1.4, spd: 0.6, crit: 0.4 },
    control: { hp: 0.8, atk: 0.8, def: 0.8, spd: 1.3, crit: 0.6 },
    sacrifice: { hp: 0.7, atk: 1.6, def: 0.4, spd: 1.1, crit: 1.0 },
    summon: { hp: 0.9, atk: 1.0, def: 0.7, spd: 1.0, crit: 0.8 },
  }

  // Path bias by style
  const pathBias: Record<string, Partial<Record<CultivationPath, number>>> = {
    burst: { sword: 1.5, void: 0.8 },
    tank: { body: 1.5, formation: 1.0 },
    control: { formation: 1.4, void: 1.2 },
    sacrifice: { void: 1.5, sword: 1.0 },
    summon: { beast: 1.5, void: 0.8 },
  }

  const riskAmp = policy.mutationExposureMultiplier

  return {
    preferredCombatStyle: preferredStyle,
    statWeights: baseWeights[preferredStyle] ?? baseWeights.burst,
    pathBias: pathBias[preferredStyle] ?? {},
    riskAmplification: riskAmp,
  }
}

// ---------------------------------------------------------------------------
// Recommend cultivation path
// ---------------------------------------------------------------------------

export function recommendCultivationPath(character: Character, policyId: SectRiskPolicyId): CultivationPath {
  if (character.cultivationPath !== 'none') return character.cultivationPath

  const profile = generateCultivationProfile(character, policyId)
  const biasEntries = Object.entries(profile.pathBias)

  if (biasEntries.length === 0) return 'sword'

  // Pick path with highest bias + randomness
  const rolled = biasEntries.map(([path, bias]) => ({
    path: path as CultivationPath,
    score: bias + Math.random() * 0.5,
  }))

  rolled.sort((a, b) => b.score - a.score)
  return rolled[0].path
}

// ---------------------------------------------------------------------------
// Get policy style names for UI
// ---------------------------------------------------------------------------

export const STYLE_NAMES: Record<string, string> = {
  burst: '爆发',
  tank: '承伤',
  control: '控场',
  sacrifice: '献祭',
  summon: '召唤',
}
