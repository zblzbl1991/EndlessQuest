/**
 * Mid-game regression test fixture.
 *
 * This file exports a complete save state representing a mid-game sect
 * (宗门位阶 3, 筑基~金丹弟子, unlocked buildings, equipped gear, pets, etc.).
 *
 * Usage:
 *   import { loadTestSave } from '../save/testFixture'
 *   await loadTestSave()   // writes into IndexedDB, next reload picks it up
 *
 * Or in browser: navigate to ?loadTestSave=true
 */

import type { Pet } from '../pet/PetSystem'
import { getDB } from './db'

// ---------------------------------------------------------------------------
// Fixture data — structured to match what SaveSystem.loadGame() expects
// ---------------------------------------------------------------------------

const NOW = Date.now()

const META = {
  slot: 1,
  version: 8 as const,
  lastOnlineTime: NOW,
  sectName: '天机阁',
  sectLevel: 3,
  resources: {
    spiritStone: 12800,
    spiritEnergy: 420,
    herb: 85,
    ore: 42,
  },
  techniqueCodex: ['qingxin', 'lieyan', 'houtu', 'fentian', 'xuanbing', 'leiyu'],
  maxVaultSlots: 50,
  totalAdventureRuns: 7,
  totalBreakthroughs: 4,
  lastTransmissionTime: NOW - 86400000,
  sectPath: 'sword' as const,
  activeRoute: null,
  unlockedPathNodeIds: ['sword_basic', 'sword_fury'],
  pathUnlockedAt: NOW - 259200000,
  legacy: {
    ascensionCount: 0,
    statBonus: 0,
    unlockedTechniques: [],
    unlockedDungeons: [],
  },
  stats: {
    totalSpiritStoneEarned: 45200,
    totalSpiritStoneSpent: 32400,
    totalBattles: 63,
    totalVictories: 48,
    totalKills: 187,
    maxFloorCleared: 8,
    totalRecruits: 6,
    totalBreakthroughAttempts: 5,
    totalBreakthroughSuccesses: 4,
    totalBuildingUpgrades: 14,
    totalAdventureRuns: 7,
    totalAdventureCompletions: 5,
    totalAdventureFailures: 2,
    totalPetCaptures: 2,
    totalPlayTime: 172800,
    longestOfflineSeconds: 14400,
  },
  archiveMilestones: [
    { id: 'firstRareRecruit', unlockedAt: NOW - 432000000 },
    { id: 'firstTribulationSuccess', unlockedAt: NOW - 172800000 },
    { id: 'firstDungeonClear', unlockedAt: NOW - 86400000 },
  ],
  automationSettings: {
    reserveSpiritStone: 2000,
    reserveSpiritEnergy: 200,
    preferredDungeonId: 'luoYunCave',
    casualtyTolerance: 'balanced',
    autoBreakthrough: true,
  },
  strategySettings: {
    activePolicy: 'balanced',
    switchCooldownDays: 3,
    lastSwitchedAt: NOW - 259200000,
  },
  currentGameDay: 12,
  dayProgressSec: 28800,
  lastRandomEventTime: 172700,
}

// ---------------------------------------------------------------------------
// Characters — 6 disciples with varied quality/realm/equipment
// ---------------------------------------------------------------------------

const CHARACTERS = [
  // 灵品弟子 — 筑基中期, 主力输出
  {
    id: 'char_test_01',
    name: '李青云',
    title: 'seniorDisciple',
    quality: 'spirit',
    realm: 1,
    realmStage: 1,
    cultivation: 2100,
    baseStats: { hp: 186, atk: 28, def: 14, spd: 18, crit: 0.08, critDmg: 1.65 },
    cultivationStats: { spiritPower: 45, maxSpiritPower: 145, comprehension: 35, spiritualRoot: 52, fortune: 28 },
    learnedTechniques: ['qingxin', 'lieyan', 'fentian'],
    equippedGear: ['eq_test_01', 'eq_test_02', null, null, 'eq_test_03', 'eq_test_04', null, null, null],
    equippedSkills: ['fireball', 'iceShard', null, null, null],
    backpack: [
      {
        item: {
          id: 'cons_test_01',
          name: '回气丹',
          quality: 'common',
          type: 'consumable',
          description: '恢复少量灵气',
          sellPrice: 10,
          effect: { type: 'spiritEnergy', value: 30 },
          recipeId: 'minor_spirit_potion',
        },
        quantity: 5,
      },
    ],
    maxBackpackSlots: 20,
    petIds: ['pet_test_01'],
    talents: [
      {
        id: 'bornStrong',
        name: '天生神力',
        description: '攻击+5',
        rarity: 'rare',
        effect: [{ stat: 'atk', value: 5 }],
      },
    ],
    status: 'idle',
    injuryTimer: 0,
    recoveryDaysRemaining: 0,
    createdAt: NOW - 864000000,
    totalCultivation: 8500,
    specialties: [
      { type: 'combat', level: 2 },
      { type: 'forging', level: 1 },
    ],
    assignedBuilding: null,
    cultivationPath: 'sword',
    fateGrid: 'wisdom' as const,
    investedSpiritStone: 500,
    techniqueComprehension: { qingxin: 65, lieyan: 42, fentian: 18 },
  },
  // 灵品弟子 — 筑基初期, 坦克/防御
  {
    id: 'char_test_02',
    name: '王铁柱',
    title: 'disciple',
    quality: 'spirit',
    realm: 1,
    realmStage: 0,
    cultivation: 800,
    baseStats: { hp: 220, atk: 16, def: 24, spd: 12, crit: 0.04, critDmg: 1.45 },
    cultivationStats: { spiritPower: 30, maxSpiritPower: 130, comprehension: 28, spiritualRoot: 48, fortune: 18 },
    learnedTechniques: ['qingxin', 'houtu', 'xuanbing'],
    equippedGear: ['eq_test_05', 'eq_test_06', null, null, null, null, null, null, null],
    equippedSkills: ['earthShield', null, null, null, null],
    backpack: [],
    maxBackpackSlots: 20,
    petIds: [],
    talents: [
      { id: 'toughBody', name: '铜皮铁骨', description: '防御+6', rarity: 'rare', effect: [{ stat: 'def', value: 6 }] },
    ],
    status: 'idle',
    injuryTimer: 0,
    recoveryDaysRemaining: 0,
    createdAt: NOW - 691200000,
    totalCultivation: 4800,
    specialties: [
      { type: 'mining', level: 2 },
      { type: 'combat', level: 1 },
    ],
    assignedBuilding: 'spiritMine',
    cultivationPath: 'body',
    fateGrid: undefined,
    investedSpiritStone: 500,
    techniqueComprehension: { qingxin: 55, houtu: 48, xuanbing: 22 },
  },
  // 凡品弟子 — 炼气圆满
  {
    id: 'char_test_03',
    name: '张小凡',
    title: 'disciple',
    quality: 'common',
    realm: 0,
    realmStage: 3,
    cultivation: 650,
    baseStats: { hp: 132, atk: 18, def: 10, spd: 13, crit: 0.06, critDmg: 1.52 },
    cultivationStats: { spiritPower: 0, maxSpiritPower: 98, comprehension: 22, spiritualRoot: 35, fortune: 15 },
    learnedTechniques: ['qingxin', 'lieyan'],
    equippedGear: [null, null, null, null, null, 'eq_test_07', null, null, null],
    equippedSkills: ['fireball', null, null, null, null],
    backpack: [
      {
        item: {
          id: 'cons_test_02',
          name: '疗伤丹',
          quality: 'common',
          type: 'consumable',
          description: '恢复生命',
          sellPrice: 8,
          effect: { type: 'heal', value: 50 },
          recipeId: 'minor_heal_potion',
        },
        quantity: 3,
      },
    ],
    maxBackpackSlots: 20,
    petIds: [],
    talents: [],
    status: 'idle',
    injuryTimer: 0,
    recoveryDaysRemaining: 0,
    createdAt: NOW - 518400000,
    totalCultivation: 2200,
    specialties: [
      { type: 'herbalism', level: 1 },
      { type: 'alchemy', level: 1 },
    ],
    assignedBuilding: 'spiritField',
    cultivationPath: 'none',
    fateGrid: undefined,
    investedSpiritStone: 100,
    techniqueComprehension: { qingxin: 40, lieyan: 35 },
  },
  // 凡品弟子 — 炼气中期, 采集型
  {
    id: 'char_test_04',
    name: '陈灵儿',
    title: 'disciple',
    quality: 'common',
    realm: 0,
    realmStage: 1,
    cultivation: 120,
    baseStats: { hp: 105, atk: 14, def: 9, spd: 15, crit: 0.05, critDmg: 1.5 },
    cultivationStats: { spiritPower: 0, maxSpiritPower: 95, comprehension: 20, spiritualRoot: 32, fortune: 25 },
    learnedTechniques: ['qingxin', 'houtu'],
    equippedGear: [],
    equippedSkills: ['earthShield', null, null, null, null],
    backpack: [],
    maxBackpackSlots: 20,
    petIds: [],
    talents: [
      {
        id: 'luckyStar',
        name: '福星高照',
        description: '运势+8',
        rarity: 'uncommon',
        effect: [{ stat: 'fortune', value: 8 }],
      },
    ],
    status: 'idle',
    injuryTimer: 0,
    recoveryDaysRemaining: 0,
    createdAt: NOW - 345600000,
    totalCultivation: 600,
    specialties: [
      { type: 'herbalism', level: 2 },
      { type: 'fortune', level: 1 },
    ],
    assignedBuilding: 'spiritField',
    cultivationPath: 'alchemy',
    fateGrid: undefined,
    investedSpiritStone: 100,
    techniqueComprehension: { qingxin: 30, houtu: 25 },
  },
  // 仙品弟子 — 金丹初期, 核心主力
  {
    id: 'char_test_05',
    name: '赵无极',
    title: 'master',
    quality: 'immortal',
    realm: 2,
    realmStage: 0,
    cultivation: 5000,
    baseStats: { hp: 380, atk: 45, def: 28, spd: 30, crit: 0.12, critDmg: 1.85 },
    cultivationStats: { spiritPower: 80, maxSpiritPower: 200, comprehension: 55, spiritualRoot: 72, fortune: 35 },
    learnedTechniques: ['qingxin', 'lieyan', 'houtu', 'fentian', 'leiyu', 'leishen'],
    equippedGear: [
      'eq_test_08',
      'eq_test_09',
      'eq_test_10',
      null,
      'eq_test_11',
      'eq_test_12',
      'eq_test_13',
      null,
      null,
    ],
    equippedSkills: ['thunderStrike', 'fireball', 'iceShard', 'earthShield', null],
    backpack: [
      {
        item: {
          id: 'cons_test_03',
          name: '大还丹',
          quality: 'spirit',
          type: 'consumable',
          description: '恢复大量灵气',
          sellPrice: 80,
          effect: { type: 'spiritEnergy', value: 150 },
          recipeId: 'major_spirit_potion',
        },
        quantity: 2,
      },
    ],
    maxBackpackSlots: 20,
    petIds: ['pet_test_02'],
    talents: [
      {
        id: 'heavenlyBody',
        name: '天灵根',
        description: '灵根+12, 悟性+8',
        rarity: 'epic',
        effect: [
          { stat: 'spiritualRoot', value: 12 },
          { stat: 'comprehension', value: 8 },
        ],
      },
    ],
    status: 'idle',
    injuryTimer: 0,
    recoveryDaysRemaining: 0,
    createdAt: NOW - 1209600000,
    totalCultivation: 52000,
    specialties: [
      { type: 'combat', level: 3 },
      { type: 'leadership', level: 2 },
      { type: 'comprehension', level: 2 },
    ],
    assignedBuilding: null,
    cultivationPath: 'sword',
    fateGrid: undefined,
    investedSpiritStone: 2000,
    techniqueComprehension: { qingxin: 88, lieyan: 72, houtu: 60, fentian: 45, leiyu: 35, leishen: 20 },
  },
  // 凡品弟子 — 受伤恢复中
  {
    id: 'char_test_06',
    name: '林小龙',
    title: 'disciple',
    quality: 'common',
    realm: 0,
    realmStage: 2,
    cultivation: 350,
    baseStats: { hp: 118, atk: 16, def: 11, spd: 14, crit: 0.05, critDmg: 1.48 },
    cultivationStats: { spiritPower: 0, maxSpiritPower: 96, comprehension: 18, spiritualRoot: 30, fortune: 12 },
    learnedTechniques: ['qingxin', 'houtu'],
    equippedGear: [null, null, null, null, null, 'eq_test_14', null, null, null],
    equippedSkills: ['earthShield', null, null, null, null],
    backpack: [],
    maxBackpackSlots: 20,
    petIds: [],
    talents: [],
    status: 'recovering',
    injuryTimer: 0,
    recoveryDaysRemaining: 2,
    createdAt: NOW - 259200000,
    totalCultivation: 1200,
    specialties: [
      { type: 'mining', level: 1 },
      { type: 'combat', level: 1 },
    ],
    assignedBuilding: null,
    cultivationPath: 'none',
    fateGrid: undefined,
    investedSpiritStone: 100,
    techniqueComprehension: { qingxin: 35, houtu: 28 },
  },
]

// ---------------------------------------------------------------------------
// Buildings — mid-game: mainHall 3, resource buildings 3, several unlocked
// ---------------------------------------------------------------------------

const BUILDINGS = [
  { type: 'mainHall', level: 3, count: 1, unlocked: true, productionQueue: { recipeId: null, progress: 0 } },
  { type: 'spiritField', level: 3, count: 2, unlocked: true, productionQueue: { recipeId: null, progress: 0 } },
  { type: 'spiritMine', level: 3, count: 2, unlocked: true, productionQueue: { recipeId: null, progress: 0 } },
  { type: 'market', level: 2, count: 1, unlocked: true, productionQueue: { recipeId: null, progress: 0 } },
  {
    type: 'alchemyFurnace',
    level: 2,
    count: 1,
    unlocked: true,
    productionQueue: { recipeId: 'refined_herb', progress: 12.5 },
  },
  { type: 'forge', level: 1, count: 1, unlocked: true, productionQueue: { recipeId: null, progress: 0 } },
  { type: 'scriptureHall', level: 1, count: 1, unlocked: true, productionQueue: { recipeId: null, progress: 0 } },
  {
    type: 'recruitmentPavilion',
    level: 0,
    count: 0,
    unlocked: false,
    productionQueue: { recipeId: null, progress: 0 },
  },
]

// ---------------------------------------------------------------------------
// Vault — equipment, consumables, materials
// ---------------------------------------------------------------------------

const VAULT = [
  // Weapons
  {
    id: 'eq_test_01',
    item: {
      id: 'eq_test_01',
      name: '碧水剑',
      quality: 'spirit',
      type: 'equipment',
      description: '灵品长剑，碧水流转',
      sellPrice: 200,
      slot: 'weapon',
      stats: { hp: 10, atk: 12, def: 0, spd: 3, crit: 0.03, critDmg: 0.1 },
      enhanceLevel: 2,
      refinementStats: [{ atk: 3 }],
      setId: null,
    },
    quantity: 1,
  },
  {
    id: 'eq_test_02',
    item: {
      id: 'eq_test_02',
      name: '灵纹护额',
      quality: 'spirit',
      type: 'equipment',
      description: '灵纹防护，护住神识',
      sellPrice: 150,
      slot: 'head',
      stats: { hp: 25, atk: 0, def: 8, spd: 0, crit: 0, critDmg: 0 },
      enhanceLevel: 1,
      refinementStats: [],
      setId: null,
    },
    quantity: 1,
  },
  {
    id: 'eq_test_03',
    item: {
      id: 'eq_test_03',
      name: '踏风靴',
      quality: 'common',
      type: 'equipment',
      description: '轻便灵巧的靴子',
      sellPrice: 40,
      slot: 'boots',
      stats: { hp: 5, atk: 0, def: 2, spd: 4, crit: 0.01, critDmg: 0 },
      enhanceLevel: 0,
      refinementStats: [],
      setId: null,
    },
    quantity: 1,
  },
  {
    id: 'eq_test_04',
    item: {
      id: 'eq_test_04',
      name: '青锋剑',
      quality: 'common',
      type: 'equipment',
      description: '普通长剑',
      sellPrice: 30,
      slot: 'weapon',
      stats: { hp: 0, atk: 6, def: 0, spd: 1, crit: 0.02, critDmg: 0.05 },
      enhanceLevel: 0,
      refinementStats: [],
      setId: null,
    },
    quantity: 1,
  },
  {
    id: 'eq_test_05',
    item: {
      id: 'eq_test_05',
      name: '玄铁甲',
      quality: 'spirit',
      type: 'equipment',
      description: '坚硬护甲',
      sellPrice: 180,
      slot: 'armor',
      stats: { hp: 40, atk: 0, def: 15, spd: -2, crit: 0, critDmg: 0 },
      enhanceLevel: 1,
      refinementStats: [{ def: 2 }],
      setId: null,
    },
    quantity: 1,
  },
  {
    id: 'eq_test_06',
    item: {
      id: 'eq_test_06',
      name: '铁壁盔',
      quality: 'common',
      type: 'equipment',
      description: '厚重头盔',
      sellPrice: 45,
      slot: 'head',
      stats: { hp: 20, atk: 0, def: 6, spd: -1, crit: 0, critDmg: 0 },
      enhanceLevel: 0,
      refinementStats: [],
      setId: null,
    },
    quantity: 1,
  },
  {
    id: 'eq_test_07',
    item: {
      id: 'eq_test_07',
      name: '新手木剑',
      quality: 'common',
      type: 'equipment',
      description: '入门木剑',
      sellPrice: 5,
      slot: 'weapon',
      stats: { hp: 0, atk: 3, def: 0, spd: 0, crit: 0, critDmg: 0 },
      enhanceLevel: 0,
      refinementStats: [],
      setId: null,
    },
    quantity: 1,
  },
  // High-end gear for immortal disciple
  {
    id: 'eq_test_08',
    item: {
      id: 'eq_test_08',
      name: '天罡冠',
      quality: 'immortal',
      type: 'equipment',
      description: '仙品法冠，天罡护体',
      sellPrice: 800,
      slot: 'head',
      stats: { hp: 45, atk: 5, def: 12, spd: 3, crit: 0.03, critDmg: 0.1 },
      enhanceLevel: 3,
      refinementStats: [{ hp: 10 }, { def: 4 }],
      setId: 'tianGang',
    },
    quantity: 1,
  },
  {
    id: 'eq_test_09',
    item: {
      id: 'eq_test_09',
      name: '天罡战甲',
      quality: 'immortal',
      type: 'equipment',
      description: '仙品战甲，坚不可摧',
      sellPrice: 900,
      slot: 'armor',
      stats: { hp: 60, atk: 8, def: 18, spd: 0, crit: 0, critDmg: 0.05 },
      enhanceLevel: 3,
      refinementStats: [{ hp: 15 }, { def: 5 }],
      setId: 'tianGang',
    },
    quantity: 1,
  },
  {
    id: 'eq_test_10',
    item: {
      id: 'eq_test_10',
      name: '流星护腕',
      quality: 'spirit',
      type: 'equipment',
      description: '灵纹护腕',
      sellPrice: 120,
      slot: 'bracer',
      stats: { hp: 15, atk: 4, def: 6, spd: 2, crit: 0.02, critDmg: 0.05 },
      enhanceLevel: 1,
      refinementStats: [],
      setId: null,
    },
    quantity: 1,
  },
  {
    id: 'eq_test_11',
    item: {
      id: 'eq_test_11',
      name: '轻灵靴',
      quality: 'spirit',
      type: 'equipment',
      description: '灵巧靴子',
      sellPrice: 110,
      slot: 'boots',
      stats: { hp: 10, atk: 2, def: 3, spd: 6, crit: 0.01, critDmg: 0 },
      enhanceLevel: 1,
      refinementStats: [],
      setId: null,
    },
    quantity: 1,
  },
  {
    id: 'eq_test_12',
    item: {
      id: 'eq_test_12',
      name: '雷鸣剑',
      quality: 'immortal',
      type: 'equipment',
      description: '仙品雷剑，剑鸣如雷',
      sellPrice: 1200,
      slot: 'weapon',
      stats: { hp: 15, atk: 28, def: 0, spd: 8, crit: 0.08, critDmg: 0.25 },
      enhanceLevel: 4,
      refinementStats: [{ atk: 5 }, { spd: 2 }, { critDmg: 0.05 }],
      setId: null,
    },
    quantity: 1,
  },
  {
    id: 'eq_test_13',
    item: {
      id: 'eq_test_13',
      name: '灵玉佩',
      quality: 'spirit',
      type: 'equipment',
      description: '灵玉饰品',
      sellPrice: 100,
      slot: 'accessory1',
      stats: { hp: 8, atk: 3, def: 2, spd: 2, crit: 0.02, critDmg: 0.05 },
      enhanceLevel: 0,
      refinementStats: [],
      setId: null,
    },
    quantity: 1,
  },
  {
    id: 'eq_test_14',
    item: {
      id: 'eq_test_14',
      name: '铁剑',
      quality: 'common',
      type: 'equipment',
      description: '普通铁剑',
      sellPrice: 15,
      slot: 'weapon',
      stats: { hp: 0, atk: 4, def: 0, spd: 0, crit: 0.01, critDmg: 0 },
      enhanceLevel: 0,
      refinementStats: [],
      setId: null,
    },
    quantity: 1,
  },
  // Consumables in vault
  {
    id: 'cons_test_10',
    item: {
      id: 'cons_test_10',
      name: '回气丹',
      quality: 'common',
      type: 'consumable',
      description: '恢复少量灵气',
      sellPrice: 10,
      effect: { type: 'spiritEnergy', value: 30 },
      recipeId: 'minor_spirit_potion',
    },
    quantity: 12,
  },
  {
    id: 'cons_test_11',
    item: {
      id: 'cons_test_11',
      name: '疗伤丹',
      quality: 'common',
      type: 'consumable',
      description: '恢复生命',
      sellPrice: 8,
      effect: { type: 'heal', value: 50 },
      recipeId: 'minor_heal_potion',
    },
    quantity: 8,
  },
  // Materials in vault
  {
    id: 'mat_test_01',
    item: {
      id: 'mat_test_01',
      name: '精炼灵草',
      quality: 'common',
      type: 'material',
      description: '炼制材料：精炼灵草',
      sellPrice: 25,
      category: 'herb',
    },
    quantity: 15,
  },
  {
    id: 'mat_test_02',
    item: {
      id: 'mat_test_02',
      name: '精炼矿材',
      quality: 'common',
      type: 'material',
      description: '炼制材料：精炼矿材',
      sellPrice: 30,
      category: 'ore',
    },
    quantity: 8,
  },
  // Technique scroll
  {
    id: 'scroll_test_01',
    item: {
      id: 'scroll_test_01',
      name: '焚天诀残卷',
      quality: 'spirit',
      type: 'techniqueScroll',
      description: '记载着焚天诀的残缺功法',
      sellPrice: 500,
      techniqueId: 'fentian',
    },
    quantity: 1,
  },
]

// ---------------------------------------------------------------------------
// Pets — 2 pets with different qualities
// ---------------------------------------------------------------------------

const PETS: Pet[] = [
  {
    id: 'pet_test_01',
    name: '小火狐',
    quality: 'spirit',
    element: 'fire',
    level: 8,
    talent: 55,
    innateSkill: { id: 'bite', name: '撕咬', multiplier: 1.4, element: 'fire', description: '烈焰撕咬' },
    equippedSkills: [null, null],
    stats: { hp: 28, atk: 8, def: 4, spd: 6 },
  },
  {
    id: 'pet_test_02',
    name: '灵鹿',
    quality: 'immortal',
    element: 'neutral',
    level: 15,
    talent: 72,
    innateSkill: { id: 'roar', name: '怒吼', multiplier: 1.0, element: 'ice', description: '寒冰怒吼' },
    equippedSkills: [{ id: 'claw', name: '利爪', multiplier: 1.2, element: 'neutral', description: '利爪攻击' }, null],
    stats: { hp: 52, atk: 12, def: 8, spd: 10 },
  },
]

// ---------------------------------------------------------------------------
// loadTestSave — write fixture into IndexedDB
// ---------------------------------------------------------------------------

export async function loadTestSave(): Promise<boolean> {
  try {
    const db = await getDB()

    // Clear existing data first
    const storeNames = ['meta', 'characters', 'buildings', 'vault', 'pets', 'adventure', 'history'] as const
    const clearTx = db.transaction(storeNames, 'readwrite')
    for (const name of storeNames) {
      await clearTx.objectStore(name).clear()
    }
    await clearTx.done

    // Write fixture data
    const tx = db.transaction(['meta', 'characters', 'buildings', 'vault', 'pets', 'adventure'] as const, 'readwrite')

    // Meta
    await tx.objectStore('meta').put(META)

    // Characters
    const charStore = tx.objectStore('characters')
    for (const c of CHARACTERS) {
      await charStore.put(c)
    }

    // Buildings
    const bldgStore = tx.objectStore('buildings')
    for (const b of BUILDINGS) {
      await bldgStore.put(b)
    }

    // Vault — each entry has { id, item, quantity }, id = item.id for keyPath
    const vaultStore = tx.objectStore('vault')
    for (const v of VAULT) {
      await vaultStore.put(v)
    }

    // Pets
    const petStore = tx.objectStore('pets')
    for (const p of PETS) {
      await petStore.put(p)
    }

    // Adventure (empty)
    // No records to write

    await tx.done
    return true
  } catch (e) {
    console.error('loadTestSave failed:', e)
    return false
  }
}

// ---------------------------------------------------------------------------
// getTestFixtureSummary — for diagnostics
// ---------------------------------------------------------------------------

export function getTestFixtureSummary(): string {
  return [
    `宗门: ${META.sectName} (Lv${META.sectLevel})`,
    `路线: ${META.sectPath}`,
    `资源: 灵石${META.resources.spiritStone} 灵气${META.resources.spiritEnergy} 灵草${META.resources.herb} 矿材${META.resources.ore}`,
    `弟子: ${CHARACTERS.length} 人 (${CHARACTERS.map((c) => c.name).join(', ')})`,
    `装备: ${VAULT.length} 件仓库物品`,
    `灵宠: ${PETS.length} 只 (${PETS.map((p) => p.name).join(', ')})`,
    `建筑: ${BUILDINGS.filter((b) => b.unlocked).length}/${BUILDINGS.length} 已解锁`,
    `功法: ${META.techniqueCodex.join(', ')}`,
  ].join('\n')
}
