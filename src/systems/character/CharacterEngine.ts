import type { Character, CharacterQuality, BaseStats, CultivationStats } from '../../types/character'
import type { Equipment } from '../../types/item'
import type { Talent, TalentRarity } from '../../types/talent'
import { ALL_TALENTS } from '../../data/talents'
import { syncCharacterSkillLoadout } from '../../data/activeSkills'
import { getObservedBuildingLevel } from '../../data/buildings'
import { getTechniqueById } from '../../data/techniquesTable'
import { rollSpecialties } from './SpecialtySystem'
import { applyPathStatBonuses } from './CultivationPathSystem'

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

// ---------------------------------------------------------------------------
// Talent configuration per quality
// ---------------------------------------------------------------------------

const QUALITY_TALENT_CONFIG: Record<
  CharacterQuality,
  {
    talentCount: { min: number; max: number; probabilities: number[] }
    rarityWeights: Record<TalentRarity, number>
  }
> = {
  common: {
    talentCount: { min: 0, max: 1, probabilities: [0.6, 0.4] },
    rarityWeights: { common: 0.7, rare: 0.3, epic: 0 },
  },
  spirit: {
    talentCount: { min: 0, max: 1, probabilities: [0.5, 0.5] },
    rarityWeights: { common: 0.6, rare: 0.35, epic: 0.05 },
  },
  immortal: {
    talentCount: { min: 0, max: 2, probabilities: [0.4, 0.35, 0.25] },
    rarityWeights: { common: 0.5, rare: 0.4, epic: 0.1 },
  },
  divine: {
    talentCount: { min: 1, max: 2, probabilities: [0.6, 0.4] },
    rarityWeights: { common: 0.4, rare: 0.45, epic: 0.15 },
  },
  chaos: {
    talentCount: { min: 1, max: 3, probabilities: [0.5, 0.3, 0.2] },
    rarityWeights: { common: 0.3, rare: 0.45, epic: 0.25 },
  },
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

function getEcologyBonusTechniques(): string[] {
  const bonus: string[] = []
  const ecologyOrder: Array<{ type: Parameters<typeof getObservedBuildingLevel>[0]; minLevel: number; techniques: string[] }> = [
    { type: 'forge', minLevel: 3, techniques: ['lieyan', 'fentian'] },
    { type: 'alchemyFurnace', minLevel: 3, techniques: ['xuanbing', 'jiuzhuan'] },
    { type: 'scriptureHall', minLevel: 3, techniques: ['taishang', 'qingxin'] },
    { type: 'spiritField', minLevel: 4, techniques: ['houtu'] },
    { type: 'spiritMine', minLevel: 4, techniques: ['bumiejinshen'] },
    { type: 'recruitmentPavilion', minLevel: 3, techniques: ['wanjianguizong'] },
  ]

  for (const entry of ecologyOrder) {
    const observed = getObservedBuildingLevel(entry.type)
    if (observed < entry.minLevel) continue
    for (const techniqueId of entry.techniques) {
      if (!bonus.includes(techniqueId)) bonus.push(techniqueId)
    }
  }

  return bonus.slice(0, 2)
}

function applyBuildingEcologyToSpecialties(
  specialties: Character['specialties'],
  ecologyLevel: number
): Character['specialties'] {
  let next = [...specialties]
  if (ecologyLevel >= 3) next = mergeSpecialtyLevels(next, 'comprehension', 2)
  if (ecologyLevel >= 4) next = mergeSpecialtyLevels(next, 'leadership', 1)
  return next
}

function applyBuildingEcologyBiases(
  specialties: Character['specialties']
): { specialties: Character['specialties']; learnedTechniques: string[] } {
  const observed = {
    forge: getObservedBuildingLevel('forge'),
    alchemyFurnace: getObservedBuildingLevel('alchemyFurnace'),
    scriptureHall: getObservedBuildingLevel('scriptureHall'),
    spiritField: getObservedBuildingLevel('spiritField'),
    spiritMine: getObservedBuildingLevel('spiritMine'),
    recruitmentPavilion: getObservedBuildingLevel('recruitmentPavilion'),
  }

  let nextSpecialties = [...specialties]
  if (observed.forge >= 3) nextSpecialties = mergeSpecialtyLevels(nextSpecialties, 'combat', 2)
  if (observed.alchemyFurnace >= 3) nextSpecialties = mergeSpecialtyLevels(nextSpecialties, 'alchemy', 2)
  if (observed.scriptureHall >= 3) nextSpecialties = mergeSpecialtyLevels(nextSpecialties, 'comprehension', 2)
  if (observed.spiritField >= 4) nextSpecialties = mergeSpecialtyLevels(nextSpecialties, 'herbalism', 2)
  if (observed.spiritMine >= 4) nextSpecialties = mergeSpecialtyLevels(nextSpecialties, 'mining', 2)
  if (observed.recruitmentPavilion >= 3) nextSpecialties = mergeSpecialtyLevels(nextSpecialties, 'leadership', 2)

  const bonusTechniques = getEcologyBonusTechniques()

  if (observed.forge >= 3) nextSpecialties = applyBuildingEcologyToSpecialties(nextSpecialties, observed.forge)

  return {
    specialties: nextSpecialties,
    learnedTechniques: bonusTechniques,
  }
}

function rollTalents(quality: CharacterQuality): Talent[] {
  const config = QUALITY_TALENT_CONFIG[quality]
  const { min, max, probabilities } = config.talentCount

  // Determine talent count
  let count = min
  const roll = Math.random()
  let cumulative = 0
  for (let i = 0; i < probabilities.length; i++) {
    cumulative += probabilities[i]
    if (roll < cumulative) {
      count = min + i
      break
    }
  }
  count = Math.min(count, max)

  if (count === 0) return []

  // Select talents by rarity weight
  const available = [...ALL_TALENTS]
  const talents: Talent[] = []

  for (let i = 0; i < count && available.length > 0; i++) {
    const rarityRoll = Math.random()
    let cumulativeRarity = 0
    let selectedRarity: TalentRarity = 'common'
    for (const [rarity, weight] of Object.entries(config.rarityWeights)) {
      cumulativeRarity += weight
      if (rarityRoll < cumulativeRarity) {
        selectedRarity = rarity as TalentRarity
        break
      }
    }

    const candidates = available.filter((t) => t.rarity === selectedRarity)
    if (candidates.length > 0) {
      const talent = candidates[Math.floor(Math.random() * candidates.length)]
      talents.push(talent)
      available.splice(available.indexOf(talent), 1)
    } else {
      // Fallback: pick any remaining
      const talent = available.splice(Math.floor(Math.random() * available.length), 1)[0]
      talents.push(talent)
    }
  }

  return talents
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
// Sect level table
// ---------------------------------------------------------------------------

const SECT_LEVEL_TABLE = [
  { mainHallRequired: 1, maxCharacters: 5, maxSimultaneousRuns: 1 },
  { mainHallRequired: 3, maxCharacters: 10, maxSimultaneousRuns: 1 },
  { mainHallRequired: 5, maxCharacters: 15, maxSimultaneousRuns: 2 },
  { mainHallRequired: 8, maxCharacters: 20, maxSimultaneousRuns: 2 },
  { mainHallRequired: 10, maxCharacters: 30, maxSimultaneousRuns: 3 },
]

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

/**
 * Generate a new character with the given quality.
 */
export function generateCharacter(quality: CharacterQuality): Character {
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

  // Roll talents
  const talents = rollTalents(quality)

  // Apply talent effects to stats
  for (const talent of talents) {
    for (const eff of talent.effect) {
      if (isBaseStatKey(eff.stat)) {
        baseStats[eff.stat] += eff.value
      } else if (isCultivationStatKey(eff.stat)) {
        cultivationStats[eff.stat] += eff.value
      }
    }
  }

  // Chaos upgrade: divine has 0.5% chance to become chaos
  if (quality === 'divine' && Math.random() < 0.005) {
    quality = 'chaos'
  }

  const ecologyBias = applyBuildingEcologyBiases(rollSpecialties(quality))
  const learnedTechniques = ['qingxin', ...ecologyBias.learnedTechniques]
  const specialties = applyBuildingEcologyToSpecialties(ecologyBias.specialties, getObservedBuildingLevel('scriptureHall'))

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
    createdAt: Date.now(),
    totalCultivation: 0,
    specialties,
    assignedBuilding: null,
    cultivationPath: 'none',
    fateTags: [],
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
 */
export function getMaxCharacters(sectLevel: number): number {
  const entry = SECT_LEVEL_TABLE[sectLevel - 1]
  return entry ? entry.maxCharacters : 5
}

/**
 * Get the maximum number of simultaneous adventure runs for a given sect level.
 */
export function getMaxSimultaneousRuns(sectLevel: number): number {
  const entry = SECT_LEVEL_TABLE[sectLevel - 1]
  return entry ? entry.maxSimultaneousRuns : 1
}

/**
 * Calculate the sect level (1-5) based on the main hall building level.
 * Returns the highest table entry where mainHallRequired <= mainHallLevel.
 */
export function calcSectLevel(mainHallLevel: number): number {
  let level = 1
  for (let i = 0; i < SECT_LEVEL_TABLE.length; i++) {
    if (mainHallLevel >= SECT_LEVEL_TABLE[i].mainHallRequired) {
      level = i + 1
    } else {
      break
    }
  }
  return level
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
  spirit: 2,
  immortal: 3,
  divine: 4,
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
  const sectLvl = QUALITY_UNLOCK_LEVEL[quality]
  if (sectLvl === undefined) return undefined
  const entry = SECT_LEVEL_TABLE[sectLvl - 1]
  return entry?.mainHallRequired
}
