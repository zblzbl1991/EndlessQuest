import type { Character, CharacterQuality, BaseStats } from '../../types/character'
import type { Technique } from '../../types/technique'
import type { Equipment } from '../../types/item'

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
  '李', '王', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴',
  '徐', '孙', '马', '朱', '胡', '郭', '林', '何', '高', '梁',
  '郑', '罗', '宋', '谢', '唐', '韩', '曹', '许', '邓', '萧',
  '冯', '程', '蔡', '彭', '潘', '袁', '于', '董', '余', '苏',
  '叶', '吕', '魏', '蒋', '田', '杜', '丁', '沈', '姜', '范',
]

const GIVEN_NAMES = [
  '天行', '无极', '清风', '明月', '紫霄', '玄霜', '青云', '碧落',
  '长风', '凌霄', '若水', '流光', '星辰', '天羽', '墨尘', '云深',
  '孤鸿', '寒烟', '素心', '秋水', '踏雪', '寻仙', '问道', '归元',
  '灵虚', '清虚', '玄冥', '玉清', '太初', '无尘', '沧海', '拂晓',
  '明远', '怀瑾', '逸仙', '若兰', '沐风', '揽月', '听雨', '临渊',
  '飞鸿', '映雪', '望舒', '扶摇', '栖桐', '鹤鸣', '子墨', '青衫',
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
// Comprehension effect tiers
// ---------------------------------------------------------------------------

/**
 * Returns a multiplier (0.3, 0.7, or 1.0) based on technique comprehension level.
 * - 0-29   -> 0.3
 * - 30-69  -> 0.7
 * - 70-100 -> 1.0
 */
function getComprehensionEffect(comprehension: number): number {
  if (comprehension >= 70) return 1.0
  if (comprehension >= 30) return 0.7
  return 0.3
}

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

  return {
    id: 'char_' + Date.now() + '_' + (++_idCounter),
    name: generateName(),
    title: 'disciple',
    quality,
    realm: 0,
    realmStage: 0,
    cultivation: 0,
    baseStats: {
      hp: 100,
      atk: 15,
      def: 8,
      spd: 10,
      crit: 0.05,
      critDmg: 1.5,
    },
    cultivationStats: {
      spiritPower: 0,
      maxSpiritPower: 100,
      comprehension: qStats.comprehension,
      spiritualRoot: qStats.spiritualRoot,
      fortune: qStats.fortune,
    },
    currentTechnique: null,
    techniqueComprehension: 0,
    learnedTechniques: [],
    equippedGear: [],
    equippedSkills: [],
    backpack: [],
    maxBackpackSlots: 20,
    petIds: [],
    status: 'cultivating',
    injuryTimer: 0,
    createdAt: Date.now(),
    totalCultivation: 0,
  }
}

/**
 * Calculate total stats for a character, factoring in equipment and technique.
 */
export function calcCharacterTotalStats(
  character: Character,
  technique: Technique | null,
  getEquipmentById: (id: string) => Equipment | undefined,
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

  // 3. Apply technique if present
  if (technique) {
    const effect = getComprehensionEffect(character.techniqueComprehension)

    // Multiplicative growth modifiers scaled by comprehension effect
    total.hp *= 1 + technique.growthModifiers.hp * effect
    total.atk *= 1 + technique.growthModifiers.atk * effect
    total.def *= 1 + technique.growthModifiers.def * effect
    total.spd *= 1 + technique.growthModifiers.spd * effect
    total.crit *= 1 + technique.growthModifiers.crit * effect
    total.critDmg *= 1 + technique.growthModifiers.critDmg * effect

    // Flat fixed bonuses based on comprehension thresholds
    // Bonus index 0: unlocked at comprehension >= 30
    // Bonus index 1: unlocked at comprehension >= 70
    // Bonus index 2: unlocked at comprehension >= 100
    const thresholds = [30, 70, 100]
    for (let i = 0; i < technique.fixedBonuses.length; i++) {
      const threshold = thresholds[i] ?? 100
      if (character.techniqueComprehension >= threshold) {
        const bonus = technique.fixedBonuses[i]
        const key = bonus.type as keyof BaseStats
        if (key in total) {
          ;(total as unknown as Record<string, number>)[key] += bonus.value
        }
      }
    }
  }

  // 4. Round to avoid floating-point artifacts
  total.hp = Math.round(total.hp * 100) / 100
  total.atk = Math.round(total.atk * 100) / 100
  total.def = Math.round(total.def * 100) / 100
  total.spd = Math.round(total.spd * 100) / 100
  total.crit = Math.round(total.crit * 1000) / 1000
  total.critDmg = Math.round(total.critDmg * 100) / 100

  return total
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
