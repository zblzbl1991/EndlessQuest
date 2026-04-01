import type {
  Character,
  CharacterQuality,
  CultivationPath,
  FateTag,
  Specialty,
  SpecialtyType,
} from '../../types/character'
import { SPECIALTY_BONUS_TABLE, SPECIALTY_BUILDING_MAP, ALL_SPECIALTY_TYPES } from '../../data/specialties'

interface SpecialtyConfig {
  minCount: number
  maxCount: number
  probability: number
  level2Chance: number
  level3Chance: number
}

const QUALITY_SPECIALTY_CONFIG: Record<CharacterQuality, SpecialtyConfig> = {
  common: { minCount: 0, maxCount: 0, probability: 0, level2Chance: 0, level3Chance: 0 },
  spirit: { minCount: 0, maxCount: 1, probability: 0.5, level2Chance: 0.2, level3Chance: 0 },
  immortal: { minCount: 1, maxCount: 1, probability: 1.0, level2Chance: 0.3, level3Chance: 0.05 },
  divine: { minCount: 1, maxCount: 2, probability: 1.0, level2Chance: 0.4, level3Chance: 0.1 },
  chaos: { minCount: 1, maxCount: 2, probability: 1.0, level2Chance: 0.5, level3Chance: 0.2 },
}

export function rollSpecialties(quality: CharacterQuality): Specialty[] {
  const config = QUALITY_SPECIALTY_CONFIG[quality]
  if (Math.random() > config.probability) return []

  const count = config.minCount + Math.floor(Math.random() * (config.maxCount - config.minCount + 1))
  const usedTypes = new Set<SpecialtyType>()
  const specialties: Specialty[] = []

  for (let i = 0; i < count; i++) {
    const available = ALL_SPECIALTY_TYPES.filter((t) => !usedTypes.has(t))
    if (available.length === 0) break

    const type = available[Math.floor(Math.random() * available.length)]
    usedTypes.add(type)

    let level: 1 | 2 | 3 = 1
    if (Math.random() < config.level3Chance) {
      level = 3
    } else if (Math.random() < config.level2Chance) {
      level = 2
    }

    specialties.push({ type, level })
  }

  return specialties
}

export function getSpecialtyBonus(type: SpecialtyType, level: number): number {
  return SPECIALTY_BONUS_TABLE[type]?.[level] ?? 0
}

/**
 * Calculate the multiplier bonus for a building from a list of specialties.
 * Returns 1.0 + sum of matching bonuses. Same-type takes highest level.
 */
export function getBuildingBonus(buildingType: string, specialties: Specialty[]): number {
  let bonus = 0
  const bestPerType = new Map<SpecialtyType, number>()

  for (const spec of specialties) {
    const current = bestPerType.get(spec.type) ?? 0
    if (spec.level > current) {
      bestPerType.set(spec.type, spec.level)
    }
  }

  for (const [type, level] of bestPerType) {
    if (SPECIALTY_BUILDING_MAP[type] === buildingType) {
      bonus += getSpecialtyBonus(type, level)
    }
  }

  return 1 + bonus
}

/** Role types that map to adventure rather than a building */
const ADVENTURE_ROLES: SpecialtyType[] = ['combat', 'fortune', 'leadership']

/** Chinese labels for each specialty/role */
const ROLE_LABELS: Record<string, string> = {
  alchemy: '炼丹',
  forging: '锻造',
  mining: '采矿',
  herbalism: '采药',
  comprehension: '参悟',
  combat: '战斗',
  fortune: '探险',
  leadership: '统领',
}

const PATH_ROLE_BONUSES: Partial<Record<CultivationPath, Partial<Record<SpecialtyType, number>>>> = {
  sword: { combat: 7, fortune: 2 },
  body: { leadership: 6, combat: 2 },
  alchemy: { alchemy: 7, comprehension: 3 },
  beast: { fortune: 6, leadership: 3, combat: 2 },
  formation: { comprehension: 6, leadership: 4 },
  void: { combat: 5, fortune: 4, comprehension: 2 },
}

const FATE_ROLE_BONUSES: Record<FateTag, Partial<Record<SpecialtyType, number>>> = {
  tribulationScar: { combat: 7, fortune: 3 },
  heartDevilSeed: { combat: 8, fortune: 3 },
  suddenInsight: { comprehension: 8, alchemy: 3, fortune: 1 },
  stableDaoHeart: { alchemy: 4, comprehension: 4, leadership: 3 },
}

function getRoleScore(character: Character, role: SpecialtyType, specialtyOrder: Map<SpecialtyType, number>): number {
  const specialty = character.specialties.find((owned) => owned.type === role)
  if (!specialty) return Number.NEGATIVE_INFINITY

  let score = specialty.level * 10 - (specialtyOrder.get(role) ?? 0)

  if (character.cultivationPath !== 'none') {
    score += PATH_ROLE_BONUSES[character.cultivationPath]?.[role] ?? 0
  }

  for (const fateTag of character.fateTags) {
    score += FATE_ROLE_BONUSES[fateTag]?.[role] ?? 0
  }

  return score
}

/** Return the primary role string for a character after accounting for specialties, path, and fate. */
export function getPrimaryRole(character: Character): SpecialtyType | null {
  if (character.specialties.length === 0) return null

  const specialtyOrder = new Map(character.specialties.map((specialty, index) => [specialty.type, index]))
  let bestRole: SpecialtyType | null = null
  let bestScore = Number.NEGATIVE_INFINITY

  for (const specialty of character.specialties) {
    const score = getRoleScore(character, specialty.type, specialtyOrder)
    if (score > bestScore) {
      bestRole = specialty.type
      bestScore = score
    }
  }

  return bestRole
}

/** Return the recommended building assignment, or 'adventure' for combat/fortune roles, or null if no specialties. */
export function getRecommendedAssignment(character: Character): string | null {
  const role = getPrimaryRole(character)
  if (!role) return null
  if (ADVENTURE_ROLES.includes(role)) return 'adventure'
  return SPECIALTY_BUILDING_MAP[role] ?? null
}

/** Return a Chinese readable label for a role string. */
export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? ''
}
