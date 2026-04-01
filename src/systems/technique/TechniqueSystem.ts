import type { Character, CultivationPath, SpecialtyType } from '../../types/character'
import type { Technique, TechniqueStyle, TechniqueTier } from '../../types/technique'
import { TECHNIQUE_TIER_ORDER } from '../../types/technique'
import { TECHNIQUES } from '../../data/techniquesTable'
import { calcFateTagInsightChanceModifier } from '../../data/fateTags'

const REALM_TIER_CEILING: TechniqueTier[] = ['mortal', 'spirit', 'immortal', 'divine', 'chaos']
const BASE_TECHNIQUE_CODEX_CAPACITY = 3
const SCRIPTURE_HALL_CAPACITY_PER_LEVEL = 2

function getMaxTierForExploration(floorNumber: number): TechniqueTier {
  if (floorNumber <= 5) return 'spirit'
  if (floorNumber <= 10) return 'immortal'
  if (floorNumber <= 15) return 'divine'
  return 'chaos'
}

function getStyleWeightForSpecialty(style: TechniqueStyle, specialty: SpecialtyType): number {
  switch (specialty) {
    case 'combat':
      return style === 'burst' || style === 'tempo' ? 1.6 : 0
    case 'comprehension':
      return style === 'cultivation' || style === 'balanced' ? 1.8 : 0
    case 'alchemy':
    case 'herbalism':
      return style === 'cultivation' || style === 'survival' ? 1.2 : 0
    case 'forging':
    case 'mining':
      return style === 'guard' || style === 'survival' ? 1.1 : 0
    case 'leadership':
      return style === 'balanced' || style === 'guard' ? 0.8 : 0
    case 'fortune':
      return style === 'tempo' || style === 'balanced' ? 0.7 : 0
    default:
      return 0
  }
}

function getPathFamilyBonus(path: CultivationPath | undefined, technique: Technique): number {
  switch (path) {
    case 'sword':
      return technique.family === 'weapon' || technique.styles.includes('burst') ? 4 : 0
    case 'body':
      return technique.family === 'body' || technique.styles.includes('guard') ? 4 : 0
    case 'alchemy':
      return technique.styles.includes('cultivation') || technique.element === 'fire' || technique.element === 'ice'
        ? 4
        : 0
    case 'formation':
      return technique.family === 'mystic' || technique.styles.includes('balanced') ? 4 : 0
    case 'void':
      return technique.tier === 'divine' || technique.tier === 'chaos' || technique.styles.includes('tempo') ? 4 : 0
    case 'beast':
      return technique.styles.includes('survival') || technique.styles.includes('tempo') ? 2.5 : 0
    default:
      return 0
  }
}

function getLearnedElementBonus(character: Pick<Character, 'learnedTechniques'>, technique: Technique): number {
  if (technique.element === 'neutral') return 0
  const learnedElements = new Set(
    character.learnedTechniques
      .map((techId) => TECHNIQUES.find((item) => item.id === techId)?.element)
      .filter((element): element is Technique['element'] => Boolean(element))
  )
  return learnedElements.has(technique.element) ? 1.2 : 0
}

function pickWeightedTechnique(
  candidates: Technique[],
  getWeight: (technique: Technique) => number,
  randomFn: () => number
): string | null {
  const weighted = candidates.map((technique) => ({
    technique,
    weight: Math.max(0.1, getWeight(technique)),
  }))
  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0)
  if (totalWeight <= 0) return null

  let roll = randomFn() * totalWeight
  for (const entry of weighted) {
    roll -= entry.weight
    if (roll <= 0) return entry.technique.id
  }

  return weighted[weighted.length - 1]?.technique.id ?? null
}

export function getTechniqueCodexCapacity(scriptureHallLevel: number): number {
  return BASE_TECHNIQUE_CODEX_CAPACITY + Math.max(0, scriptureHallLevel) * SCRIPTURE_HALL_CAPACITY_PER_LEVEL
}

export function hasTechniqueCodexCapacity(knownTechniqueIds: string[], scriptureHallLevel: number): boolean {
  return knownTechniqueIds.length < getTechniqueCodexCapacity(scriptureHallLevel)
}

export function canLearnTechnique(character: Character, technique: Technique): boolean {
  return (
    character.realm >= technique.requirements.minRealm &&
    character.cultivationStats.comprehension >= technique.requirements.minComprehension
  )
}

export function calcTechniqueAffinityWeight(
  character: Pick<
    Character,
    'learnedTechniques' | 'cultivationPath' | 'specialties' | 'fateTags' | 'realm' | 'cultivationStats'
  >,
  technique: Technique
): number {
  let weight = 1

  weight += getPathFamilyBonus(character.cultivationPath, technique)

  for (const specialty of character.specialties ?? []) {
    weight += getStyleWeightForSpecialty(technique.styles[0] ?? 'balanced', specialty.type)
    for (const style of technique.styles) {
      weight += getStyleWeightForSpecialty(style, specialty.type)
    }
  }

  weight += getLearnedElementBonus(character, technique)

  if (character.fateTags?.includes('suddenInsight') && technique.styles.includes('cultivation')) weight += 1.2
  if (character.fateTags?.includes('stableDaoHeart') && technique.styles.includes('balanced')) weight += 1
  if (character.fateTags?.includes('heartDevilSeed') && technique.styles.includes('burst')) weight += 0.8
  if (character.fateTags?.includes('tribulationScar') && technique.tier !== 'mortal') weight += 0.6

  const realmTierIdx = TECHNIQUE_TIER_ORDER.indexOf(REALM_TIER_CEILING[Math.min(character.realm, 4)])
  const techniqueTierIdx = TECHNIQUE_TIER_ORDER.indexOf(technique.tier)
  if (techniqueTierIdx === realmTierIdx) weight += 0.8

  if (character.cultivationStats.comprehension >= technique.requirements.minComprehension + 8) {
    weight += 0.5
  }

  return weight
}

export function tryComprehendOnBreakthrough(
  character: Pick<
    Character,
    'learnedTechniques' | 'realm' | 'cultivationStats' | 'fateTags' | 'cultivationPath' | 'specialties'
  >,
  techniqueCodex: string[],
  isMajor: boolean,
  randomFn: () => number = Math.random
): string | null {
  const chance = Math.min(
    0.95,
    Math.max(0, (isMajor ? 0.4 : 0.15) + calcFateTagInsightChanceModifier(character.fateTags ?? []))
  )
  if (randomFn() >= chance) return null

  const maxTier = REALM_TIER_CEILING[Math.min(character.realm, 4)]
  const maxTierIdx = TECHNIQUE_TIER_ORDER.indexOf(maxTier)
  const candidates = TECHNIQUES.filter((technique) => {
    if (!techniqueCodex.includes(technique.id)) return false
    if (character.learnedTechniques.includes(technique.id)) return false
    if (TECHNIQUE_TIER_ORDER.indexOf(technique.tier) > maxTierIdx) return false
    if (character.cultivationStats.comprehension < technique.requirements.minComprehension) return false
    return true
  })

  if (candidates.length === 0) return null

  return pickWeightedTechnique(candidates, (technique) => calcTechniqueAffinityWeight(character, technique), randomFn)
}

export function pickTechniqueForFloor(floorNumber: number, randomFn: () => number = Math.random): string {
  const maxTier = getMaxTierForExploration(floorNumber)
  const maxTierIdx = TECHNIQUE_TIER_ORDER.indexOf(maxTier)
  const candidates = TECHNIQUES.filter(
    (technique) =>
      technique.origin === 'dungeon' && TECHNIQUE_TIER_ORDER.indexOf(technique.tier) <= maxTierIdx
  )

  return (
    pickWeightedTechnique(
      candidates,
      (technique) => {
        const distance = maxTierIdx - TECHNIQUE_TIER_ORDER.indexOf(technique.tier)
        return Math.max(1, 4 - distance * 1.5)
      },
      randomFn
    ) ?? candidates[0]!.id
  )
}

export function pickExplorationTechniqueReward(
  floorNumber: number,
  knownTechniqueIds: string[],
  scriptureHallLevel: number,
  randomFn: () => number = Math.random
): string | null {
  if (!hasTechniqueCodexCapacity(knownTechniqueIds, scriptureHallLevel)) return null

  const maxTier = getMaxTierForExploration(floorNumber)
  const maxTierIdx = TECHNIQUE_TIER_ORDER.indexOf(maxTier)
  const candidates = TECHNIQUES.filter((technique) => {
    if (technique.origin !== 'dungeon') return false
    if (knownTechniqueIds.includes(technique.id)) return false
    return TECHNIQUE_TIER_ORDER.indexOf(technique.tier) <= maxTierIdx
  })

  if (candidates.length === 0) return null

  return pickWeightedTechnique(
    candidates,
    (technique) => {
      const distance = maxTierIdx - TECHNIQUE_TIER_ORDER.indexOf(technique.tier)
      return Math.max(1, 4 - distance * 1.5)
    },
    randomFn
  )
}
