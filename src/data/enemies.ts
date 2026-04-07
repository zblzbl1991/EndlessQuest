import type { Enemy } from '../types/adventure'
import type { CombatUnit } from '../systems/combat/CombatEngine'
import type { Character, CharacterQuality } from '../types/character'
import { TECHNIQUE_TIER_ORDER } from '../types/technique'
import { getTechniqueById } from './techniquesTable'
import type { ActiveSkill } from '../types/skill'
import { buildCharacterSkillLoadout, getActiveSkillById } from './activeSkills'
import { rollAffixes } from './affixes'
import { applyPathStatBonuses } from '../systems/character/CultivationPathSystem'
import type { SectPathCombatEffects } from '../systems/sect/SectPathEffects'
import { getEmptyCombatEffects } from '../systems/sect/SectPathEffects'
import { calcComprehensionScale } from '../systems/cultivation/CultivationEngine'
import type { ItemStats } from '../types/item'

// ─── Quality Combat Multiplier ──────────────────────────────────────────

/** Quality-based combat stat multiplier applied when creating CombatUnit from Character. */
const QUALITY_COMBAT_MULTIPLIER: Record<CharacterQuality, number> = {
  common: 1.0,
  spirit: 1.1,
  immortal: 1.2,
  divine: 1.3,
  chaos: 1.5,
}

// ─── Power Rating System ──────────────────────────────────────────────

/**
 * Evaluate a single CombatUnit's combat power rating.
 * Weights reflect each stat's contribution to combat outcome:
 * - atk: primary damage source
 * - def: damage reduction (weighted 0.8)
 * - maxHp: sustain / survivability (weighted 0.2 = hp/5)
 * - spd: turn order priority (weighted 0.5)
 * - crit: burst chance (weighted 100)
 * - critDmg: burst magnitude (weighted 50)
 */
export function calcUnitPowerRating(unit: CombatUnit): number {
  return unit.atk * 1.0 + unit.def * 0.8 + unit.maxHp * 0.2 + unit.spd * 0.5 + unit.crit * 100 + unit.critDmg * 50
}

/** Evaluate a team's total combat power rating. */
export function calcTeamPowerRating(units: CombatUnit[]): number {
  return units.reduce((sum, unit) => sum + calcUnitPowerRating(unit), 0)
}

/**
 * Adjust enemy stats so difficulty matches team power within +/-20%.
 * Layer-based scaling remains the primary factor; this is a secondary calibration.
 *
 * Regular enemy: target power is 60-100% of team power (randomly chosen).
 * Boss: base stats are already 2.5x scaled before this function; then +/-20% team power adjustment.
 */
export function adjustEnemyByTeamPower(
  enemy: CombatUnit,
  team: CombatUnit[],
  options?: { isBoss?: boolean; floor?: number }
): void {
  if (team.length === 0) return

  const teamPower = calcTeamPowerRating(team)
  const enemyPower = calcUnitPowerRating(enemy)
  if (teamPower <= 0 || enemyPower <= 0) return

  const isBoss = options?.isBoss ?? false

  // Determine target enemy power relative to team
  let targetRatio: number
  if (isBoss) {
    // Boss: 1.0-1.5x team power for a challenging but fair fight
    targetRatio = 1.0 + Math.random() * 0.5
  } else {
    // Regular enemy: 60-100% of team power
    targetRatio = 0.6 + Math.random() * 0.4
  }

  const targetEnemyPower = teamPower * targetRatio
  const adjustment = targetEnemyPower / enemyPower

  // Clamp adjustment to +/-20% (layer-based scaling is still primary)
  const clamped = Math.max(0.8, Math.min(1.2, adjustment))

  enemy.hp = Math.max(1, Math.floor(enemy.hp * clamped))
  enemy.maxHp = Math.max(1, Math.floor(enemy.maxHp * clamped))
  enemy.atk = Math.max(1, Math.floor(enemy.atk * clamped))
  enemy.def = Math.max(1, Math.floor(enemy.def * clamped))
  enemy.spd = Math.max(1, Math.floor(enemy.spd * clamped))
}

// ─── Loot System ──────────────────────────────────────────────────────

export type LootType = 'spiritStone' | 'herb' | 'ore' | 'equipment' | 'consumable' | 'petCapture'

export interface LootEntry {
  type: LootType
  weight: number
  minAmount?: number
  maxAmount?: number
  quality?: 'common' | 'spirit' | 'immortal' | 'divine' | 'chaos'
  recipeId?: string
}

export interface EnemyTemplate extends Enemy {
  lootTable: LootEntry[]
  dropsPerFight: number
}

// ─── Legacy/Fallback Templates ─────────────────────────────────────────
// These are kept for backward compatibility. Dungeon-specific enemies below
// are used when a dungeonId is provided to the selection functions.

export const ENEMY_TEMPLATES: EnemyTemplate[] = [
  // --- Legacy ---
  {
    id: 'wild_spirit_beast',
    name: '灵兽',
    element: 'neutral',
    stats: { hp: 50, atk: 8, def: 4, spd: 6 },
    isBoss: false,
    affixPool: [],
    dropsPerFight: 1,
    lootTable: [
      { type: 'spiritStone', weight: 40, minAmount: 20, maxAmount: 50 },
      { type: 'herb', weight: 25, minAmount: 2, maxAmount: 8 },
      { type: 'ore', weight: 15, minAmount: 1, maxAmount: 5 },
      { type: 'equipment', weight: 10, quality: 'common' },
      { type: 'equipment', weight: 3, quality: 'spirit' },
      { type: 'petCapture', weight: 2 },
    ],
  },
  {
    id: 'cave_demon',
    name: '洞妖',
    element: 'fire',
    stats: { hp: 120, atk: 18, def: 10, spd: 8 },
    isBoss: false,
    affixPool: ['berserk', 'swift'],
    dropsPerFight: 2,
    lootTable: [
      { type: 'spiritStone', weight: 35, minAmount: 40, maxAmount: 80 },
      { type: 'herb', weight: 10, minAmount: 3, maxAmount: 10 },
      { type: 'ore', weight: 20, minAmount: 3, maxAmount: 10 },
      { type: 'equipment', weight: 5, quality: 'common' },
      { type: 'equipment', weight: 12, quality: 'spirit' },
      { type: 'equipment', weight: 3, quality: 'immortal' },
      { type: 'petCapture', weight: 3 },
    ],
  },
  {
    id: 'spirit_boss',
    name: '灵脉守卫',
    element: 'lightning',
    stats: { hp: 220, atk: 24, def: 14, spd: 9 },
    isBoss: true,
    affixPool: ['berserk', 'shield', 'tribulationBane'],
    skillIds: ['sword_qi'],
    dropsPerFight: 3,
    lootTable: [
      { type: 'spiritStone', weight: 30, minAmount: 100, maxAmount: 300 },
      { type: 'herb', weight: 15, minAmount: 10, maxAmount: 30 },
      { type: 'ore', weight: 15, minAmount: 5, maxAmount: 20 },
      { type: 'equipment', weight: 20, quality: 'spirit' },
      { type: 'equipment', weight: 12, quality: 'immortal' },
      { type: 'equipment', weight: 3, quality: 'divine' },
      { type: 'petCapture', weight: 5 },
    ],
  },

  // --- LingCao Valley (灵草谷) - Nature/herb spirits, low difficulty ---
  {
    id: 'valley_vine_spirit',
    name: '蔓藤灵',
    element: 'neutral',
    stats: { hp: 40, atk: 8, def: 4, spd: 5 },
    isBoss: false,
    affixPool: [],
    dropsPerFight: 1,
    lootTable: [
      { type: 'spiritStone', weight: 40, minAmount: 15, maxAmount: 40 },
      { type: 'herb', weight: 30, minAmount: 3, maxAmount: 10 },
      { type: 'ore', weight: 10, minAmount: 1, maxAmount: 3 },
      { type: 'equipment', weight: 10, quality: 'common' },
      { type: 'equipment', weight: 2, quality: 'spirit' },
      { type: 'petCapture', weight: 2 },
    ],
  },
  {
    id: 'valley_herb_guardian',
    name: '草灵守卫',
    element: 'ice',
    stats: { hp: 55, atk: 10, def: 6, spd: 4 },
    isBoss: false,
    affixPool: ['shield'],
    dropsPerFight: 1,
    lootTable: [
      { type: 'spiritStone', weight: 35, minAmount: 20, maxAmount: 50 },
      { type: 'herb', weight: 30, minAmount: 4, maxAmount: 12 },
      { type: 'ore', weight: 10, minAmount: 1, maxAmount: 4 },
      { type: 'equipment', weight: 12, quality: 'common' },
      { type: 'equipment', weight: 3, quality: 'spirit' },
      { type: 'petCapture', weight: 3 },
    ],
  },
  {
    id: 'valley_ancient_treant',
    name: '古木树灵',
    element: 'neutral',
    stats: { hp: 60, atk: 12, def: 6, spd: 5 },
    isBoss: true,
    affixPool: ['shield', 'spiritDrain'],
    skillIds: ['sword_qi'],
    dropsPerFight: 3,
    lootTable: [
      { type: 'spiritStone', weight: 30, minAmount: 80, maxAmount: 200 },
      { type: 'herb', weight: 20, minAmount: 10, maxAmount: 25 },
      { type: 'ore', weight: 10, minAmount: 3, maxAmount: 10 },
      { type: 'equipment', weight: 15, quality: 'spirit' },
      { type: 'equipment', weight: 8, quality: 'immortal' },
      { type: 'equipment', weight: 2, quality: 'divine' },
      { type: 'petCapture', weight: 5 },
    ],
  },

  // --- LuoYun Cave (落云洞) - Shadows/illusions, medium difficulty ---
  {
    id: 'cave_shadow_fiend',
    name: '影魇',
    element: 'ice',
    stats: { hp: 80, atk: 14, def: 7, spd: 10 },
    isBoss: false,
    affixPool: ['swift'],
    dropsPerFight: 1,
    lootTable: [
      { type: 'spiritStone', weight: 35, minAmount: 30, maxAmount: 70 },
      { type: 'herb', weight: 15, minAmount: 3, maxAmount: 8 },
      { type: 'ore', weight: 15, minAmount: 2, maxAmount: 7 },
      { type: 'equipment', weight: 8, quality: 'common' },
      { type: 'equipment', weight: 10, quality: 'spirit' },
      { type: 'petCapture', weight: 3 },
    ],
  },
  {
    id: 'cave_illusion_weaver',
    name: '幻影蛛',
    element: 'fire',
    stats: { hp: 95, atk: 16, def: 8, spd: 9 },
    isBoss: false,
    affixPool: ['berserk', 'swift'],
    dropsPerFight: 2,
    lootTable: [
      { type: 'spiritStone', weight: 35, minAmount: 35, maxAmount: 80 },
      { type: 'herb', weight: 12, minAmount: 3, maxAmount: 9 },
      { type: 'ore', weight: 15, minAmount: 2, maxAmount: 8 },
      { type: 'equipment', weight: 6, quality: 'common' },
      { type: 'equipment', weight: 10, quality: 'spirit' },
      { type: 'equipment', weight: 3, quality: 'immortal' },
      { type: 'petCapture', weight: 3 },
    ],
  },
  {
    id: 'cave_void_phantom',
    name: '虚空幻影',
    element: 'ice',
    stats: { hp: 110, atk: 18, def: 10, spd: 9 },
    isBoss: true,
    affixPool: ['swift', 'spiritDrain'],
    skillIds: ['ice_blade'],
    dropsPerFight: 3,
    lootTable: [
      { type: 'spiritStone', weight: 30, minAmount: 100, maxAmount: 250 },
      { type: 'herb', weight: 15, minAmount: 8, maxAmount: 20 },
      { type: 'ore', weight: 12, minAmount: 4, maxAmount: 12 },
      { type: 'equipment', weight: 15, quality: 'spirit' },
      { type: 'equipment', weight: 10, quality: 'immortal' },
      { type: 'equipment', weight: 3, quality: 'divine' },
      { type: 'petCapture', weight: 5 },
    ],
  },

  // --- Blood Demon Abyss (血魔渊) - Blood/demons, high difficulty ---
  {
    id: 'abyss_blood_spawn',
    name: '血煞',
    element: 'fire',
    stats: { hp: 150, atk: 24, def: 12, spd: 10 },
    isBoss: false,
    affixPool: ['berserk'],
    dropsPerFight: 2,
    lootTable: [
      { type: 'spiritStone', weight: 35, minAmount: 50, maxAmount: 120 },
      { type: 'herb', weight: 10, minAmount: 4, maxAmount: 12 },
      { type: 'ore', weight: 18, minAmount: 4, maxAmount: 12 },
      { type: 'equipment', weight: 4, quality: 'common' },
      { type: 'equipment', weight: 10, quality: 'spirit' },
      { type: 'equipment', weight: 5, quality: 'immortal' },
      { type: 'petCapture', weight: 3 },
    ],
  },
  {
    id: 'abyss_demon_soldier',
    name: '魔兵',
    element: 'fire',
    stats: { hp: 180, atk: 22, def: 16, spd: 8 },
    isBoss: false,
    affixPool: ['shield', 'berserk'],
    dropsPerFight: 2,
    lootTable: [
      { type: 'spiritStone', weight: 35, minAmount: 55, maxAmount: 130 },
      { type: 'herb', weight: 8, minAmount: 4, maxAmount: 10 },
      { type: 'ore', weight: 18, minAmount: 5, maxAmount: 14 },
      { type: 'equipment', weight: 3, quality: 'common' },
      { type: 'equipment', weight: 12, quality: 'spirit' },
      { type: 'equipment', weight: 5, quality: 'immortal' },
      { type: 'petCapture', weight: 3 },
    ],
  },
  {
    id: 'abyss_blood_demon_lord',
    name: '血魔领主',
    element: 'fire',
    stats: { hp: 160, atk: 26, def: 14, spd: 10 },
    isBoss: true,
    affixPool: ['berserk', 'spiritDrain', 'tribulationBane'],
    skillIds: ['fire_palm'],
    dropsPerFight: 3,
    lootTable: [
      { type: 'spiritStone', weight: 25, minAmount: 150, maxAmount: 400 },
      { type: 'herb', weight: 12, minAmount: 10, maxAmount: 30 },
      { type: 'ore', weight: 12, minAmount: 6, maxAmount: 18 },
      { type: 'equipment', weight: 15, quality: 'spirit' },
      { type: 'equipment', weight: 12, quality: 'immortal' },
      { type: 'equipment', weight: 4, quality: 'divine' },
      { type: 'petCapture', weight: 5 },
    ],
  },

  // --- Dragon Bone Wasteland (龙骨荒原) - Dragon/bones, very high difficulty ---
  {
    id: 'wasteland_bone_drake',
    name: '骨龙崽',
    element: 'lightning',
    stats: { hp: 240, atk: 32, def: 22, spd: 12 },
    isBoss: false,
    affixPool: ['shield'],
    dropsPerFight: 2,
    lootTable: [
      { type: 'spiritStone', weight: 30, minAmount: 80, maxAmount: 180 },
      { type: 'herb', weight: 8, minAmount: 5, maxAmount: 15 },
      { type: 'ore', weight: 18, minAmount: 8, maxAmount: 20 },
      { type: 'equipment', weight: 3, quality: 'common' },
      { type: 'equipment', weight: 8, quality: 'spirit' },
      { type: 'equipment', weight: 8, quality: 'immortal' },
      { type: 'petCapture', weight: 4 },
    ],
  },
  {
    id: 'wasteland_dragon_skeleton',
    name: '龙骸',
    element: 'neutral',
    stats: { hp: 280, atk: 36, def: 20, spd: 10 },
    isBoss: false,
    affixPool: ['berserk', 'shield'],
    dropsPerFight: 2,
    lootTable: [
      { type: 'spiritStone', weight: 30, minAmount: 90, maxAmount: 200 },
      { type: 'herb', weight: 6, minAmount: 5, maxAmount: 14 },
      { type: 'ore', weight: 18, minAmount: 8, maxAmount: 22 },
      { type: 'equipment', weight: 2, quality: 'common' },
      { type: 'equipment', weight: 10, quality: 'spirit' },
      { type: 'equipment', weight: 8, quality: 'immortal' },
      { type: 'petCapture', weight: 4 },
    ],
  },
  {
    id: 'wasteland_elder_dragon_lord',
    name: '远古龙皇骸骨',
    element: 'lightning',
    stats: { hp: 260, atk: 38, def: 22, spd: 12 },
    isBoss: true,
    affixPool: ['berserk', 'shield', 'tribulationBane'],
    skillIds: ['thunder_strike'],
    dropsPerFight: 3,
    lootTable: [
      { type: 'spiritStone', weight: 25, minAmount: 200, maxAmount: 600 },
      { type: 'herb', weight: 10, minAmount: 12, maxAmount: 35 },
      { type: 'ore', weight: 10, minAmount: 8, maxAmount: 25 },
      { type: 'equipment', weight: 10, quality: 'spirit' },
      { type: 'equipment', weight: 15, quality: 'immortal' },
      { type: 'equipment', weight: 5, quality: 'divine' },
      { type: 'petCapture', weight: 6 },
    ],
  },

  // --- Nine Nether Purgatory (九幽炼狱) - Ghosts/nether, extreme difficulty ---
  {
    id: 'purgatory_wraith',
    name: '幽魂',
    element: 'ice',
    stats: { hp: 320, atk: 40, def: 24, spd: 14 },
    isBoss: false,
    affixPool: ['swift'],
    dropsPerFight: 2,
    lootTable: [
      { type: 'spiritStone', weight: 30, minAmount: 120, maxAmount: 280 },
      { type: 'herb', weight: 8, minAmount: 8, maxAmount: 20 },
      { type: 'ore', weight: 15, minAmount: 10, maxAmount: 25 },
      { type: 'equipment', weight: 2, quality: 'common' },
      { type: 'equipment', weight: 8, quality: 'spirit' },
      { type: 'equipment', weight: 10, quality: 'immortal' },
      { type: 'equipment', weight: 2, quality: 'divine' },
      { type: 'petCapture', weight: 4 },
    ],
  },
  {
    id: 'purgatory_nether_hound',
    name: '冥犬',
    element: 'fire',
    stats: { hp: 350, atk: 44, def: 22, spd: 16 },
    isBoss: false,
    affixPool: ['berserk', 'swift'],
    dropsPerFight: 2,
    lootTable: [
      { type: 'spiritStone', weight: 30, minAmount: 130, maxAmount: 300 },
      { type: 'herb', weight: 6, minAmount: 8, maxAmount: 22 },
      { type: 'ore', weight: 15, minAmount: 10, maxAmount: 28 },
      { type: 'equipment', weight: 2, quality: 'common' },
      { type: 'equipment', weight: 6, quality: 'spirit' },
      { type: 'equipment', weight: 10, quality: 'immortal' },
      { type: 'equipment', weight: 3, quality: 'divine' },
      { type: 'petCapture', weight: 4 },
    ],
  },
  {
    id: 'purgatory_nether_king',
    name: '冥王',
    element: 'ice',
    stats: { hp: 380, atk: 48, def: 26, spd: 14 },
    isBoss: true,
    affixPool: ['berserk', 'shield', 'spiritDrain', 'tribulationBane'],
    skillIds: ['ice_blade', 'fire_palm'],
    dropsPerFight: 3,
    lootTable: [
      { type: 'spiritStone', weight: 20, minAmount: 300, maxAmount: 800 },
      { type: 'herb', weight: 10, minAmount: 15, maxAmount: 40 },
      { type: 'ore', weight: 10, minAmount: 12, maxAmount: 35 },
      { type: 'equipment', weight: 8, quality: 'spirit' },
      { type: 'equipment', weight: 12, quality: 'immortal' },
      { type: 'equipment', weight: 8, quality: 'divine' },
      { type: 'equipment', weight: 1, quality: 'chaos' },
      { type: 'petCapture', weight: 6 },
    ],
  },

  // --- Heavenly Tribulation Realm (天劫秘境) - Lightning/tribulation, ultimate difficulty ---
  {
    id: 'tribulation_lightning_elemental',
    name: '雷灵',
    element: 'lightning',
    stats: { hp: 420, atk: 50, def: 30, spd: 18 },
    isBoss: false,
    affixPool: ['swift', 'tribulationBane'],
    dropsPerFight: 2,
    lootTable: [
      { type: 'spiritStone', weight: 28, minAmount: 180, maxAmount: 400 },
      { type: 'herb', weight: 6, minAmount: 10, maxAmount: 28 },
      { type: 'ore', weight: 12, minAmount: 12, maxAmount: 30 },
      { type: 'equipment', weight: 2, quality: 'common' },
      { type: 'equipment', weight: 6, quality: 'spirit' },
      { type: 'equipment', weight: 10, quality: 'immortal' },
      { type: 'equipment', weight: 4, quality: 'divine' },
      { type: 'petCapture', weight: 5 },
    ],
  },
  {
    id: 'tribulation_thunder_golem',
    name: '雷岩巨像',
    element: 'lightning',
    stats: { hp: 480, atk: 44, def: 36, spd: 14 },
    isBoss: false,
    affixPool: ['shield', 'tribulationBane'],
    dropsPerFight: 2,
    lootTable: [
      { type: 'spiritStone', weight: 28, minAmount: 200, maxAmount: 450 },
      { type: 'herb', weight: 5, minAmount: 10, maxAmount: 25 },
      { type: 'ore', weight: 15, minAmount: 14, maxAmount: 35 },
      { type: 'equipment', weight: 2, quality: 'common' },
      { type: 'equipment', weight: 5, quality: 'spirit' },
      { type: 'equipment', weight: 12, quality: 'immortal' },
      { type: 'equipment', weight: 5, quality: 'divine' },
      { type: 'petCapture', weight: 5 },
    ],
  },
  {
    id: 'tribulation_heavenly_tribulation_spirit',
    name: '天劫之灵',
    element: 'lightning',
    stats: { hp: 500, atk: 56, def: 32, spd: 16 },
    isBoss: true,
    affixPool: ['berserk', 'shield', 'swift', 'tribulationBane'],
    skillIds: ['thunder_strike', 'sword_qi'],
    dropsPerFight: 3,
    lootTable: [
      { type: 'spiritStone', weight: 20, minAmount: 400, maxAmount: 1200 },
      { type: 'herb', weight: 8, minAmount: 20, maxAmount: 50 },
      { type: 'ore', weight: 8, minAmount: 15, maxAmount: 40 },
      { type: 'equipment', weight: 6, quality: 'spirit' },
      { type: 'equipment', weight: 12, quality: 'immortal' },
      { type: 'equipment', weight: 10, quality: 'divine' },
      { type: 'equipment', weight: 2, quality: 'chaos' },
      { type: 'petCapture', weight: 8 },
    ],
  },
]

// ─── Dungeon-Enemy Mapping ─────────────────────────────────────────────

/** Maps dungeon IDs to their themed enemy template IDs. */
const DUNGEON_ENEMY_MAP: Record<string, { regular: string[]; boss: string }> = {
  lingCaoValley: {
    regular: ['valley_vine_spirit', 'valley_herb_guardian'],
    boss: 'valley_ancient_treant',
  },
  luoYunCave: {
    regular: ['cave_shadow_fiend', 'cave_illusion_weaver'],
    boss: 'cave_void_phantom',
  },
  bloodDemonAbyss: {
    regular: ['abyss_blood_spawn', 'abyss_demon_soldier'],
    boss: 'abyss_blood_demon_lord',
  },
  dragonBoneWasteland: {
    regular: ['wasteland_bone_drake', 'wasteland_dragon_skeleton'],
    boss: 'wasteland_elder_dragon_lord',
  },
  nineNetherPurgatory: {
    regular: ['purgatory_wraith', 'purgatory_nether_hound'],
    boss: 'purgatory_nether_king',
  },
  heavenlyTribulationRealm: {
    regular: ['tribulation_lightning_elemental', 'tribulation_thunder_golem'],
    boss: 'tribulation_heavenly_tribulation_spirit',
  },
}

/** Get dungeon-themed regular enemy templates. Falls back to all non-boss templates if dungeonId is unknown. */
export function getEnemiesForDungeon(dungeonId: string): EnemyTemplate[] {
  const mapping = DUNGEON_ENEMY_MAP[dungeonId]
  if (!mapping) return ENEMY_TEMPLATES.filter((e) => !e.isBoss)
  return mapping.regular
    .map((id) => ENEMY_TEMPLATES.find((e) => e.id === id))
    .filter((e): e is EnemyTemplate => e !== undefined)
}

/** Get the boss template for a specific dungeon. Falls back to the first boss template if dungeonId is unknown. */
export function getBossForDungeon(dungeonId: string): EnemyTemplate {
  const mapping = DUNGEON_ENEMY_MAP[dungeonId]
  if (mapping) {
    const boss = ENEMY_TEMPLATES.find((e) => e.id === mapping.boss)
    if (boss) return boss
  }
  return ENEMY_TEMPLATES.find((e) => e.isBoss) as EnemyTemplate
}

export function scaleEnemy(baseStats: { hp: number; atk: number; def: number; spd: number }, layer: number) {
  const mult = 1 + 0.08 * layer
  return {
    hp: Math.floor(baseStats.hp * mult),
    atk: Math.floor(baseStats.atk * mult),
    def: Math.floor(baseStats.def * mult),
    spd: Math.floor(baseStats.spd * mult),
  }
}

/** Scale enemy stats by the boss multiplier (1.8x base). */
export function scaleBossStats(baseStats: { hp: number; atk: number; def: number; spd: number }): {
  hp: number
  atk: number
  def: number
  spd: number
} {
  return {
    hp: Math.floor(baseStats.hp * 1.8),
    atk: Math.floor(baseStats.atk * 1.8),
    def: Math.floor(baseStats.def * 1.8),
    spd: Math.floor(baseStats.spd * 1.8),
  }
}

export function createCombatUnitFromEnemy(enemy: Enemy, layer: number): CombatUnit {
  const scaled = scaleEnemy(enemy.stats, layer)

  // Resolve skills from skillIds
  const skills: ActiveSkill[] = []
  if (enemy.skillIds) {
    for (const sid of enemy.skillIds) {
      const skill = getActiveSkillById(sid)
      if (skill) skills.push(skill)
    }
  }

  // Roll affixes from pool
  const affixes =
    enemy.affixPool && enemy.affixPool.length > 0
      ? rollAffixes(enemy.affixPool, enemy.isBoss ? 2 : 1)
      : (enemy.affixes ?? [])

  return {
    id: enemy.id,
    name: enemy.name,
    team: 'enemy',
    hp: scaled.hp,
    maxHp: scaled.hp,
    atk: scaled.atk,
    def: scaled.def,
    spd: scaled.spd,
    crit: 0.05,
    critDmg: 1.5,
    element: enemy.element,
    spiritPower: 30,
    maxSpiritPower: 30,
    skills,
    skillCooldowns: new Array(skills.length).fill(0),
    affixes,
    isBoss: enemy.isBoss,
    aggro: 0,
    shield: 0,
  }
}

/**
 * Create a combat unit from a Character and their learned techniques.
 *
 * Steps:
 * 1. Start with character.baseStats
 * 2. Sum bonuses from all learned techniques (flat additive)
 * 3. Use character.cultivationStats.spiritPower/maxSpiritPower
 * 4. Resolve equippedSkills to ActiveSkill objects
 * 5. Use highest tier technique's element, or 'neutral' if no techniques
 */
export function createCharacterCombatUnit(
  character: Character,
  learnedTechniques: string[],
  sectCombatEffects?: SectPathCombatEffects,
  equipmentStats?: ItemStats
): CombatUnit {
  const effects = sectCombatEffects ?? getEmptyCombatEffects()
  const base = character.baseStats

  let hp = base.hp
  let atk = base.atk
  let def = base.def
  let spd = base.spd
  let crit = base.crit
  let critDmg = base.critDmg

  // Collect bonuses from all techniques, scaled by comprehension
  let highestTierIdx = -1
  let element: string = 'neutral'

  for (const techId of learnedTechniques) {
    const technique = getTechniqueById(techId)
    if (!technique) continue

    // Track highest tier for element
    const tierIdx = TECHNIQUE_TIER_ORDER.indexOf(technique.tier)
    if (tierIdx > highestTierIdx) {
      highestTierIdx = tierIdx
      element = technique.element
    }

    // Calculate comprehension scale for this technique
    const comprehension = character.techniqueComprehension?.[techId]
    const compScale = calcComprehensionScale(comprehension)

    // Sum bonuses, scaled by comprehension
    for (const bonus of technique.bonuses) {
      const scaledValue = bonus.value * compScale
      switch (bonus.type) {
        case 'hp':
          hp += scaledValue
          break
        case 'atk':
          atk += scaledValue
          break
        case 'def':
          def += scaledValue
          break
        case 'spd':
          spd += scaledValue
          break
        case 'crit':
          crit = Math.round((crit + scaledValue) * 10000) / 10000
          break
        case 'critDmg':
          critDmg = Math.round((critDmg + scaledValue) * 100) / 100
          break
        // cultivationRate and other non-stat bonuses are handled elsewhere
      }
    }
  }

  const pathStats = applyPathStatBonuses({ hp, atk, def, spd, crit, critDmg }, character.cultivationPath)

  // Realm bonus: each realm level +3% all stats, each realmStage +1% all stats
  const realmMultiplier = 1 + character.realm * 0.03 + character.realmStage * 0.01

  // Quality bonus multiplier
  const qualityMultiplier = QUALITY_COMBAT_MULTIPLIER[character.quality] ?? 1

  // Combat specialty bonus: each level +5%
  const combatSpecialtyLevel = character.specialties.find((s) => s.type === 'combat')?.level ?? 0
  const specialtyMultiplier = 1 + combatSpecialtyLevel * 0.05

  const totalMultiplier = realmMultiplier * qualityMultiplier * specialtyMultiplier

  // Add equipment stats before applying multipliers
  if (equipmentStats) {
    pathStats.hp += equipmentStats.hp
    pathStats.atk += equipmentStats.atk
    pathStats.def += equipmentStats.def
    pathStats.spd += equipmentStats.spd
    pathStats.crit = Math.round((pathStats.crit + equipmentStats.crit) * 10000) / 10000
    pathStats.critDmg = Math.round((pathStats.critDmg + equipmentStats.critDmg) * 100) / 100
  }

  const totalStats = {
    hp: Math.floor(pathStats.hp * totalMultiplier),
    atk: Math.floor(pathStats.atk * totalMultiplier * effects.atk),
    def: Math.floor(pathStats.def * totalMultiplier),
    spd: Math.floor(pathStats.spd * totalMultiplier * effects.spd),
    crit: Math.round(pathStats.crit * totalMultiplier * effects.crit * 10000) / 10000,
    critDmg: Math.round(pathStats.critDmg * totalMultiplier * 100) / 100,
  }

  const resolvedLoadout =
    character.equippedSkills.length > 0 && character.equippedSkills.some((skillId) => skillId !== null)
      ? character.equippedSkills
      : buildCharacterSkillLoadout(character)
  const skills = resolveSkills(resolvedLoadout)

  return {
    id: character.id,
    name: character.name,
    team: 'ally',
    hp: totalStats.hp,
    maxHp: totalStats.hp,
    atk: totalStats.atk,
    def: totalStats.def,
    spd: totalStats.spd,
    crit: totalStats.crit,
    critDmg: totalStats.critDmg,
    element,
    spiritPower: character.cultivationStats.spiritPower,
    maxSpiritPower: character.cultivationStats.maxSpiritPower,
    skills,
    skillCooldowns: new Array(skills.length).fill(0),
    affixes: [],
    preset: 'balanced',
    aggro: 0,
    shield: 0,
  }
}

/**
 * Resolve equipped skill IDs to ActiveSkill objects, filtering out nulls and unknowns.
 */
function resolveSkills(equippedSkills: (string | null)[]): ActiveSkill[] {
  const skills: ActiveSkill[] = []
  for (const skillId of equippedSkills) {
    if (!skillId) continue
    const skill = getActiveSkillById(skillId)
    if (skill) skills.push(skill)
  }
  return skills
}

// ─── Backward-compatible alias ───────────────────────────────────────
// TODO: Remove once all call sites are migrated to createCharacterCombatUnit

/** @deprecated Use createCharacterCombatUnit instead */
export function createPlayerCombatUnit(player: {
  id: string
  name: string
  baseStats: { hp: number; atk: number; def: number; spd: number; crit: number; critDmg: number }
  totalHp?: number
  totalAtk?: number
  totalDef?: number
  totalSpd?: number
  totalCrit?: number
  totalCritDmg?: number
  skills?: ActiveSkill[]
  spiritPower?: number
  maxSpiritPower?: number
}): CombatUnit {
  return {
    id: player.id,
    name: player.name,
    team: 'ally',
    hp: player.totalHp ?? player.baseStats.hp,
    maxHp: player.totalHp ?? player.baseStats.hp,
    atk: player.totalAtk ?? player.baseStats.atk,
    def: player.totalDef ?? player.baseStats.def,
    spd: player.totalSpd ?? player.baseStats.spd,
    crit: player.totalCrit ?? player.baseStats.crit,
    critDmg: player.totalCritDmg ?? player.baseStats.critDmg,
    element: 'neutral',
    spiritPower: player.spiritPower ?? 50,
    maxSpiritPower: player.maxSpiritPower ?? 50,
    skills: player.skills ?? [],
    skillCooldowns: new Array((player.skills ?? []).length).fill(0),
    affixes: [],
    preset: 'balanced',
    aggro: 0,
    shield: 0,
  }
}
