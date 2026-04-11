import type { Character, CharacterQuality, BaseStats, CultivationStats, ElementAffinity } from '../../types/character'
import type { Equipment } from '../../types/item'
import type { Talent, TalentAffixInstance } from '../../types/talent'
import type { Element } from '../../types/skill'
import { syncCharacterSkillLoadout } from '../../data/activeSkills'
import { getTechniqueById } from '../../data/techniquesTable'
import type { SectRouteId } from '../../data/sectRoutes'
import { rollSpecialties } from './SpecialtySystem'
import { applyPathStatBonuses } from './CultivationPathSystem'
import { tryAcquireFateGrid } from '../../systems/destiny/DestinySystem'
import { generateGrowthMultipliers } from './GrowthMultiplierSystem'
import { rollAffixes } from './TalentAffixGenerator'

// ---------------------------------------------------------------------------
// Quality stat table
// ---------------------------------------------------------------------------

const QUALITY_STATS: Record<CharacterQuality, { spiritualRoot: number; comprehension: number; fortune: number }> = {
  common: { spiritualRoot: 10, comprehension: 10, fortune: 5 },
  spirit: { spiritualRoot: 15, comprehension: 13, fortune: 8 },
  immortal: { spiritualRoot: 20, comprehension: 18, fortune: 12 },
  divine: { spiritualRoot: 28, comprehension: 25, fortune: 18 },
  chaos: { spiritualRoot: 35, comprehension: 30, fortune: 25 },
}

// ---------------------------------------------------------------------------
// Quality variance table (±range for each stat)
// ---------------------------------------------------------------------------

const QUALITY_VARIANCE: Record<CharacterQuality, number> = {
  common: 0.2,
  spirit: 0.18,
  immortal: 0.15,
  divine: 0.12,
  chaos: 0.1,
}

const BASE_STAT_KEYS = ['hp', 'atk', 'def', 'spd', 'crit', 'critDmg'] as const satisfies ReadonlyArray<keyof BaseStats>
const CULTIVATION_STAT_KEYS = [
  'spiritPower',
  'maxSpiritPower',
  'comprehension',
  'spiritualRoot',
  'fortune',
] as const satisfies ReadonlyArray<keyof CultivationStats>

function isBaseStatKey(stat: string): stat is keyof BaseStats {
  return BASE_STAT_KEYS.includes(stat as (typeof BASE_STAT_KEYS)[number])
}

function isCultivationStatKey(stat: string): stat is keyof CultivationStats {
  return CULTIVATION_STAT_KEYS.includes(stat as (typeof CULTIVATION_STAT_KEYS)[number])
}

function mergeSpecialtyLevels(
  base: Character['specialties'],
  type: Character['specialties'][number]['type'],
  level: 1 | 2 | 3
): Character['specialties'] {
  const next = [...base]
  const existing = next.find((spec) => spec.type === type)
  if (!existing) {
    next.push({ type, level })
    return next
  }
  if (level > existing.level) {
    existing.level = level
  }
  return next
}

function applyRouteIdentityBiases(
  specialties: Character['specialties'],
  routeId: SectRouteId | null
): Character['specialties'] {
  let next = [...specialties]

  switch (routeId) {
    case 'alchemy':
      next = mergeSpecialtyLevels(next, 'alchemy', 2)
      next = mergeSpecialtyLevels(next, 'comprehension', 1)
      break
    case 'sword':
      next = mergeSpecialtyLevels(next, 'combat', 2)
      break
    case 'beast':
      next = mergeSpecialtyLevels(next, 'fortune', 2)
      next = mergeSpecialtyLevels(next, 'leadership', 1)
      break
  }

  return next
}

// ---------------------------------------------------------------------------
// Variance helper
// ---------------------------------------------------------------------------

function applyVariance(value: number, range: number, isFloat: boolean): number {
  const factor = 1 + (Math.random() * 2 - 1) * range
  const result = value * factor
  if (isFloat) return Math.round(result * 1000) / 1000
  return Math.max(0, Math.round(result))
}

// ---------------------------------------------------------------------------
// Sect level & capacity formulas
// ---------------------------------------------------------------------------

/** Sect level = main hall level (1:1 mapping, capped at 1-10) */
const MIN_SECT_LEVEL = 1
const MAX_SECT_LEVEL = 10

// ---------------------------------------------------------------------------
// Chinese name generation
// ---------------------------------------------------------------------------

const SURNAMES = [
  '李',
  '王',
  '张',
  '刘',
  '陈',
  '杨',
  '赵',
  '黄',
  '周',
  '吴',
  '徐',
  '孙',
  '马',
  '朱',
  '胡',
  '郭',
  '林',
  '何',
  '高',
  '梁',
  '郑',
  '罗',
  '宋',
  '谢',
  '唐',
  '韩',
  '曹',
  '许',
  '邓',
  '萧',
  '冯',
  '程',
  '蔡',
  '彭',
  '潘',
  '袁',
  '于',
  '董',
  '余',
  '苏',
  '叶',
  '吕',
  '魏',
  '蒋',
  '田',
  '杜',
  '丁',
  '沈',
  '姜',
  '范',
]

const GIVEN_NAMES = [
  '天行',
  '无极',
  '清风',
  '明月',
  '紫霄',
  '玄霜',
  '青云',
  '碧落',
  '长风',
  '凌霄',
  '若水',
  '流光',
  '星辰',
  '天羽',
  '墨尘',
  '云深',
  '孤鸿',
  '寒烟',
  '素心',
  '秋水',
  '踏雪',
  '寻仙',
  '问道',
  '归元',
  '灵虚',
  '清虚',
  '玄冥',
  '玉清',
  '太初',
  '无尘',
  '沧海',
  '拂晓',
  '明远',
  '怀瑾',
  '逸仙',
  '若兰',
  '沐风',
  '揽月',
  '听雨',
  '临渊',
  '飞鸿',
  '映雪',
  '望舒',
  '扶摇',
  '栖桐',
  '鹤鸣',
  '子墨',
  '青衫',
]

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateName(): string {
  return randomPick(SURNAMES) + randomPick(GIVEN_NAMES)
}

function getDefaultManagementTier(quality: CharacterQuality): Character['managementTier'] {
  switch (quality) {
    case 'chaos':
    case 'divine':
      return 'core'
    case 'immortal':
      return 'main'
    case 'spirit':
      return 'reserve'
    default:
      return 'support'
  }
}

// Monotonic counter to guarantee unique IDs even within the same millisecond
let _idCounter = 0

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return the cultivation stats associated with a given character quality.
 */
export function getQualityStats(quality: CharacterQuality): {
  spiritualRoot: number
  comprehension: number
  fortune: number
} {
  return { ...QUALITY_STATS[quality] }
}

// ---------------------------------------------------------------------------
// Element affinity generation
// ---------------------------------------------------------------------------

const WUXING_ELEMENTS: Element[] = ['metal', 'wood', 'earth', 'water', 'fire']

const SECONDARY_AFFINITY_CHANCE: Record<CharacterQuality, number> = {
  common: 0,
  spirit: 0.2,
  immortal: 0.4,
  divine: 0.6,
  chaos: 0.8,
}

function rollElementAffinity(quality: CharacterQuality): ElementAffinity {
  const primary = randomPick(WUXING_ELEMENTS)
  const secondaryChance = SECONDARY_AFFINITY_CHANCE[quality]
  const secondary =
    Math.random() < secondaryChance ? randomPick(WUXING_ELEMENTS.filter((e) => e !== primary)) : undefined
  return { primary, secondary }
}

// ---------------------------------------------------------------------------
// Talent affix stat application
// ---------------------------------------------------------------------------

function applyAffixEffects(
  affix: TalentAffixInstance | undefined,
  baseStats: BaseStats,
  cultivationStats: CultivationStats
): void {
  if (!affix) return
  for (const eff of affix.resolvedEffects) {
    if (eff.type === 'flatStat' && eff.stat) {
      if (isBaseStatKey(eff.stat)) {
        baseStats[eff.stat] += eff.value
      } else if (isCultivationStatKey(eff.stat)) {
        cultivationStats[eff.stat] += eff.value
      }
    }
  }
}

/**
 * Generate a new character with the given quality.
 */
export function generateCharacter(quality: CharacterQuality, activeRoute: SectRouteId | null = null): Character {
  const qStats = QUALITY_STATS[quality]
  const variance = QUALITY_VARIANCE[quality]

  const baseStats: BaseStats = {
    hp: applyVariance(100, variance, false),
    atk: applyVariance(15, variance, false),
    def: applyVariance(8, variance, false),
    spd: applyVariance(10, variance, false),
    crit: applyVariance(0.05, variance, true),
    critDmg: applyVariance(1.5, variance, true),
  }

  const cultivationStats = {
    spiritPower: 0,
    maxSpiritPower: applyVariance(100, variance, false),
    comprehension: applyVariance(qStats.comprehension, variance, false),
    spiritualRoot: applyVariance(qStats.spiritualRoot, variance, false),
    fortune: applyVariance(qStats.fortune, variance, false),
  }

  // Chaos upgrade: divine has 0.5% chance to become chaos
  if (quality === 'divine' && Math.random() < 0.005) {
    quality = 'chaos'
  }

  // --- Deep randomization dimensions ---

  // 1. Element affinity
  const elementAffinity = rollElementAffinity(quality)

  // 2. Growth multipliers
  const growthMultipliers = generateGrowthMultipliers(quality)

  // 3. Talent affixes (prefix + suffix)
  const { prefix, suffix } = rollAffixes(quality)

  // Apply affix effects to stats (flatStat effects only)
  applyAffixEffects(prefix, baseStats, cultivationStats)
  applyAffixEffects(suffix, baseStats, cultivationStats)

  // Legacy talents (kept for save migration compatibility, empty for new characters)
  const talents: Talent[] = []

  const learnedTechniques = ['qingxin']
  const specialties = applyRouteIdentityBiases(rollSpecialties(quality), activeRoute)

  // Assign fate grid
  const fateGrid = tryAcquireFateGrid(quality)

  // Seed technique comprehension for starter techniques (30%)
  const techniqueComprehension: Record<string, number> = {}
  for (const techId of learnedTechniques) {
    const technique = getTechniqueById(techId)
    if (technique?.origin === 'starter') {
      techniqueComprehension[techId] = 30
    }
  }

  return syncCharacterSkillLoadout({
    id: 'char_' + Date.now() + '_' + ++_idCounter,
    name: generateName(),
    title: 'disciple',
    quality,
    realm: 0,
    realmStage: 0,
    cultivation: 0,
    baseStats,
    cultivationStats,
    learnedTechniques: Array.from(new Set(learnedTechniques)),
    equippedGear: [],
    equippedSkills: [],
    backpack: [],
    maxBackpackSlots: 20,
    petIds: [],
    talents,
    status: 'idle',
    injuryTimer: 0,
    recoveryDaysRemaining: 0,
    createdAt: Date.now(),
    totalCultivation: 0,
    specialties,
    assignedBuilding: null,
    managementTier: getDefaultManagementTier(quality),
    automationRole: 'cultivation',
    cultivationPath: 'none',
    investedSpiritStone: getRecruitCost(quality),
    techniqueComprehension,
    fateGrid,
    level: 1,
    xp: 0,
    elementAffinity,
    growthMultipliers,
    prefix,
    suffix,
  })
}

/**
 * Calculate total stats for a character, factoring in equipment and all learned techniques.
 */
export function calcCharacterTotalStats(
  character: Character,
  learnedTechniques: string[],
  getEquipmentById: (id: string) => Equipment | undefined
): BaseStats {
  // 1. Start with base stats
  const total: BaseStats = { ...character.baseStats }

  // 2. Add equipment stats
  for (const gearId of character.equippedGear) {
    if (!gearId) continue
    const eq = getEquipmentById(gearId)
    if (!eq) continue
    total.hp += eq.stats.hp
    total.atk += eq.stats.atk
    total.def += eq.stats.def
    total.spd += eq.stats.spd
    total.crit += eq.stats.crit
    total.critDmg += eq.stats.critDmg
  }

  // 3. Sum all bonuses from learned techniques (flat additive to baseStats)
  for (const techId of learnedTechniques) {
    const technique = getTechniqueById(techId)
    if (!technique) continue
    for (const bonus of technique.bonuses) {
      const key = bonus.type as keyof BaseStats
      if (key in total) {
        ;(total as unknown as Record<string, number>)[key] += bonus.value
      }
    }
  }

  const withPathBonuses = applyPathStatBonuses(total, character.cultivationPath)

  // 4. Round to avoid floating-point artifacts
  withPathBonuses.hp = Math.round(withPathBonuses.hp * 100) / 100
  withPathBonuses.atk = Math.round(withPathBonuses.atk * 100) / 100
  withPathBonuses.def = Math.round(withPathBonuses.def * 100) / 100
  withPathBonuses.spd = Math.round(withPathBonuses.spd * 100) / 100
  withPathBonuses.crit = Math.round(withPathBonuses.crit * 1000) / 1000
  withPathBonuses.critDmg = Math.round(withPathBonuses.critDmg * 100) / 100

  return withPathBonuses
}

/**
 * Get the maximum number of characters allowed for a given sect level.
 * Formula: 5 + level × 5 (10/15/20/.../55)
 */
export function getMaxCharacters(sectLevel: number): number {
  return 5 + Math.max(1, Math.min(MAX_SECT_LEVEL, sectLevel)) * 5
}

/**
 * Get the maximum number of simultaneous adventure runs for a given sect level.
 * Formula: level (1~10)
 */
export function getMaxSimultaneousRuns(sectLevel: number): number {
  return Math.max(1, Math.min(MAX_SECT_LEVEL, sectLevel))
}

/**
 * Calculate the sect level based on the main hall building level.
 * Sect level = main hall level (1:1 mapping, capped at 1-10).
 */
export function calcSectLevel(mainHallLevel: number): number {
  return Math.max(MIN_SECT_LEVEL, Math.min(MAX_SECT_LEVEL, mainHallLevel))
}

// ---------------------------------------------------------------------------
// Recruit cost and quality unlock
// ---------------------------------------------------------------------------

export const RECRUIT_COSTS: Partial<Record<CharacterQuality, number>> = {
  common: 100,
  spirit: 500,
  immortal: 2000,
  divine: 8000,
}

export function getRecruitCost(quality: CharacterQuality): number {
  return RECRUIT_COSTS[quality] ?? 0
}

const QUALITY_UNLOCK_LEVEL: Partial<Record<CharacterQuality, number>> = {
  common: 1,
  spirit: 3,
  immortal: 6,
  divine: 9,
}

export function isQualityUnlocked(quality: CharacterQuality, sectLevel: number): boolean {
  const required = QUALITY_UNLOCK_LEVEL[quality]
  if (required === undefined) return false
  return sectLevel >= required
}

export function getAvailableQualities(sectLevel: number): CharacterQuality[] {
  const qualities: CharacterQuality[] = ['common', 'spirit', 'immortal', 'divine']
  return qualities.filter((q) => isQualityUnlocked(q, sectLevel))
}

/** Get the mainHall level required to unlock a character quality (for UI display) */
export function getQualityUnlockMainHallLevel(quality: CharacterQuality): number | undefined {
  // Sect level = main hall level (1:1), so the unlock level IS the main hall level
  return QUALITY_UNLOCK_LEVEL[quality]
}

/**
 * Roll recruit quality based on sect level.
 * Higher sect levels have increasing chances of better quality.
 * - Level 1-2: 100% common
 * - Level 3-5: ~15% spirit
 * - Level 6-8: ~15% spirit, ~8% immortal
 * - Level 9-10: ~15% spirit, ~8% immortal, ~2% divine
 */
export function rollRecruitQuality(sectLevel: number): CharacterQuality {
  if (sectLevel >= 9 && Math.random() < 0.02) return 'divine'
  if (sectLevel >= 6 && Math.random() < 0.08) return 'immortal'
  if (sectLevel >= 3 && Math.random() < 0.15) return 'spirit'
  return 'common'
}
