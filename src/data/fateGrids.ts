import type { FateGridDef, FateGridId, FateGridRarity, CharacterQuality } from '../types'

// ---------------------------------------------------------------------------
// 10 Fate Grid Definitions
// ---------------------------------------------------------------------------

export const FATE_GRIDS: Record<FateGridId, FateGridDef> = {
  // --- 天命格 ---
  dragonPhoenix: {
    id: 'dragonPhoenix',
    name: '龙凤之姿',
    description: '天生资质不凡，各方面都优于常人。',
    category: 'heavenly',
    rarity: 'epic',
    effects: {
      allStatGrowthModifier: 0.15,
      breakthroughSuccessBonus: 0.1,
    },
  },
  overlordBody: {
    id: 'overlordBody',
    name: '天生霸体',
    description: '体魄异常强悍，刀枪难伤，根基稳固。',
    category: 'heavenly',
    rarity: 'legendary',
    effects: {
      constitutionGrowthModifier: 0.35,
      lethalDamageReduction: 0.2,
      cultivationSpeedModifier: 0.2, // body cultivation bonus folded in
    },
  },
  bloodSuppress: {
    id: 'bloodSuppress',
    name: '血镇',
    description: '万中无一的镇命之人，气场压制一切。',
    category: 'heavenly',
    rarity: 'legendary',
    effects: {
      allStatBonus: 0.08,
      enemyStatReduction: 0.05,
      bossDamageBonus: 0.15,
    },
  },

  // --- 鬼咒格 ---
  ghostly: {
    id: 'ghostly',
    name: '万鬼缠身',
    description: '周身常伴鬼影，战斗时可借鬼力。',
    category: 'ghost',
    rarity: 'rare',
    effects: {
      attackModifier: 0.18,
      darkSkillDamageBonus: 0.25,
      ghostStrikeChance: 0.15,
      ghostStrikeDamageRate: 0.3,
      heartDemonBonus: 0.08,
    },
  },
  undying: {
    id: 'undying',
    name: '九死还魂',
    description: '命硬到离谱，阎王都嫌麻烦。',
    category: 'ghost',
    rarity: 'epic',
    effects: {
      lethalSurvivalChance: 0.4,
      postBattleRecoveryBonus: 0.3,
      cultivationSpeedPenalty: 0.1,
    },
  },

  // --- 情绪格 ---
  lastStand: {
    id: 'lastStand',
    name: '破釜沉舟',
    description: '越是绝境越是爆发，生命值越低越强。',
    category: 'emotional',
    rarity: 'rare',
    effects: {
      lowHpAttackBonus: [
        { threshold: 0.5, bonus: 0.2 },
        { threshold: 0.25, bonus: 0.15 },
      ],
      lowHpCritBonus: [{ threshold: 0.25, bonus: 0.15 }],
      retreatLootRetention: 0.6,
    },
  },
  warSpirit: {
    id: 'warSpirit',
    name: '战意凌云',
    description: '天生的战斗狂，越战越勇。',
    category: 'emotional',
    rarity: 'rare',
    effects: {
      consecutiveBattleBonus: { perBattle: 0.05, maxStacks: 5 },
      battleRouteExpBonus: 0.1,
    },
  },

  // --- 修炼格 ---
  wisdom: {
    id: 'wisdom',
    name: '慧根深种',
    description: '悟性超群，修炼事半功倍。',
    category: 'cultivation',
    rarity: 'common',
    effects: {
      cultivationSpeedModifier: 0.25,
      techniqueComprehensionModifier: 0.2,
      breakthroughSuccessBonus: 0.08,
    },
  },
  defiance: {
    id: 'defiance',
    name: '逆天改命',
    description: '不甘于天命安排，越挫越勇。',
    category: 'cultivation',
    rarity: 'epic',
    effects: {
      breakthroughExpRetentionRate: 0.6,
      breakthroughSuccessBonus: 0.12,
      breakthroughFailStackBonus: 0.05,
    },
  },

  // --- 机率格 ---
  lucky: {
    id: 'lucky',
    name: '福星高照',
    description: '运气好到离谱，好事总是主动找上门。',
    category: 'probability',
    rarity: 'rare',
    effects: {
      rareEventChanceBonus: 0.25,
      lootQualityBonus: 0.2,
      equipmentUpgradeChance: 0.15,
      suddenInsightChance: 0.05,
    },
  },
}

export const FATE_GRID_LIST = Object.values(FATE_GRIDS)

export function getFateGridDef(id: FateGridId): FateGridDef {
  return FATE_GRIDS[id]
}

// ---------------------------------------------------------------------------
// Fate Grid Acquisition
// ---------------------------------------------------------------------------

/** Probability of getting a fate grid when recruiting, by character quality */
const ACQUIRE_CHANCE_BY_QUALITY: Record<CharacterQuality, number> = {
  common: 0.05,
  spirit: 0.15,
  immortal: 0.3,
  divine: 0.5,
  chaos: 0.8,
}

/** Breakthrough major realm activation chance */
export const BREAKTHROUGH_FATE_GRID_CHANCE = 0.2

/** Rarity weights by character quality tier */
type QualityTier = 'normal' | 'high'
const RARITY_WEIGHTS: Record<QualityTier, Record<FateGridRarity, number>> = {
  // Normal quality (common, spirit)
  normal: { common: 50, rare: 30, epic: 15, legendary: 5 },
  // High quality (immortal, divine, chaos)
  high: { common: 20, rare: 35, epic: 30, legendary: 15 },
}

function getQualityTier(quality: CharacterQuality): QualityTier {
  return quality === 'immortal' || quality === 'divine' || quality === 'chaos' ? 'high' : 'normal'
}

/** Whether a character should receive a fate grid on recruitment */
export function shouldAcquireFateGrid(quality: CharacterQuality): boolean {
  return Math.random() < ACQUIRE_CHANCE_BY_QUALITY[quality]
}

/** Whether a character without a fate grid should activate one on major breakthrough */
export function shouldBreakthroughActivateFateGrid(): boolean {
  return Math.random() < BREAKTHROUGH_FATE_GRID_CHANCE
}

/** Roll a random fate grid weighted by character quality */
export function rollFateGrid(quality: CharacterQuality): FateGridId {
  const weights = RARITY_WEIGHTS[getQualityTier(quality)]
  const candidates = FATE_GRID_LIST.filter((g) => weights[g.rarity] > 0)

  const totalWeight = candidates.reduce((sum, g) => sum + weights[g.rarity], 0)
  let roll = Math.random() * totalWeight
  for (const grid of candidates) {
    roll -= weights[grid.rarity]
    if (roll <= 0) return grid.id
  }
  return candidates[0].id
}

/** Get all fate grid IDs of a given rarity */
export function getFateGridsByRarity(rarity: FateGridRarity): FateGridId[] {
  return FATE_GRID_LIST.filter((g) => g.rarity === rarity).map((g) => g.id)
}
