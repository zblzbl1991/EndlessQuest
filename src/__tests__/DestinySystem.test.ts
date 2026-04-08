import { describe, expect, it } from 'vitest'
import {
  getCharacterFateGrid,
  getCharacterFateGridEffects,
  getCultivationSpeedModifier,
  getBreakthroughSuccessBonus,
  getBreakthroughExpRetentionRate,
  getBreakthroughFailStackBonus,
  getAttackModifier,
  getCritRateBonus,
  getRareEventChanceBonus,
  getLootQualityBonus,
  getTechniqueComprehensionModifier,
  getSuddenInsightChance,
  getHeartDemonBonus,
} from '../systems/destiny/DestinySystem'
import {
  FATE_GRIDS,
  FATE_GRID_LIST,
  getFateGridDef,
  rollFateGrid,
  BREAKTHROUGH_FATE_GRID_CHANCE,
} from '../data/fateGrids'
import type { Character, CharacterQuality } from '../types/character'
import type { FateGridId, FateGridCategory, FateGridRarity } from '../types/destiny'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeChar(overrides: Partial<Character> = {}): Character {
  return {
    id: 'char_test',
    name: 'Test Disciple',
    title: 'disciple',
    quality: 'common',
    realm: 0,
    realmStage: 0,
    cultivation: 0,
    baseStats: { hp: 100, atk: 15, def: 8, spd: 10, crit: 0.05, critDmg: 1.5 },
    cultivationStats: {
      spiritPower: 40,
      maxSpiritPower: 40,
      comprehension: 12,
      spiritualRoot: 12,
      fortune: 8,
    },
    learnedTechniques: [],
    equippedGear: [],
    equippedSkills: [],
    backpack: [],
    maxBackpackSlots: 20,
    petIds: [],
    talents: [],
    status: 'idle',
    injuryTimer: 0,
    createdAt: 0,
    totalCultivation: 0,
    specialties: [],
    assignedBuilding: null,
    cultivationPath: 'none',
    investedSpiritStone: 0,
    techniqueComprehension: {},
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// getCharacterFateGrid
// ---------------------------------------------------------------------------

describe('getCharacterFateGrid', () => {
  it('returns undefined when character has no fate grid', () => {
    const char = makeChar()
    expect(getCharacterFateGrid(char)).toBeUndefined()
  })

  it('returns the fate grid id when set', () => {
    const char = makeChar({ fateGrid: 'dragonPhoenix' })
    expect(getCharacterFateGrid(char)).toBe('dragonPhoenix')
  })
})

// ---------------------------------------------------------------------------
// getCharacterFateGridEffects
// ---------------------------------------------------------------------------

describe('getCharacterFateGridEffects', () => {
  it('returns null when character has no fate grid', () => {
    const char = makeChar()
    expect(getCharacterFateGridEffects(char)).toBeNull()
  })

  it('returns effects object when character has a fate grid', () => {
    const char = makeChar({ fateGrid: 'wisdom' })
    const effects = getCharacterFateGridEffects(char)
    expect(effects).not.toBeNull()
    expect(effects!.cultivationSpeedModifier).toBe(0.25)
    expect(effects!.techniqueComprehensionModifier).toBe(0.2)
    expect(effects!.breakthroughSuccessBonus).toBe(0.08)
  })
})

// ---------------------------------------------------------------------------
// Effect query functions
// ---------------------------------------------------------------------------

describe('effect query functions return 0 without a grid', () => {
  const char = makeChar()

  it('getCultivationSpeedModifier', () => {
    expect(getCultivationSpeedModifier(char)).toBe(0)
  })

  it('getBreakthroughSuccessBonus', () => {
    expect(getBreakthroughSuccessBonus(char)).toBe(0)
  })

  it('getBreakthroughExpRetentionRate', () => {
    expect(getBreakthroughExpRetentionRate(char)).toBe(0)
  })

  it('getBreakthroughFailStackBonus', () => {
    expect(getBreakthroughFailStackBonus(char)).toBe(0)
  })

  it('getAttackModifier', () => {
    expect(getAttackModifier(char)).toBe(0)
  })

  it('getCritRateBonus', () => {
    expect(getCritRateBonus(char)).toBe(0)
  })

  it('getRareEventChanceBonus', () => {
    expect(getRareEventChanceBonus(char)).toBe(0)
  })

  it('getLootQualityBonus', () => {
    expect(getLootQualityBonus(char)).toBe(0)
  })

  it('getTechniqueComprehensionModifier', () => {
    expect(getTechniqueComprehensionModifier(char)).toBe(0)
  })

  it('getSuddenInsightChance', () => {
    expect(getSuddenInsightChance(char)).toBe(0)
  })

  it('getHeartDemonBonus', () => {
    expect(getHeartDemonBonus(char)).toBe(0)
  })
})

describe('effect query functions return correct values with grids', () => {
  it('getCultivationSpeedModifier returns net speed for overlordBody (modifier - penalty)', () => {
    // overlordBody: cultivationSpeedModifier: 0.2, no penalty
    const char = makeChar({ fateGrid: 'overlordBody' })
    expect(getCultivationSpeedModifier(char)).toBe(0.2)
  })

  it('getCultivationSpeedModifier subtracts penalty for undying', () => {
    // undying: cultivationSpeedPenalty: 0.1, no modifier
    const char = makeChar({ fateGrid: 'undying' })
    expect(getCultivationSpeedModifier(char)).toBe(-0.1)
  })

  it('getBreakthroughSuccessBonus returns correct value for dragonPhoenix', () => {
    // dragonPhoenix: breakthroughSuccessBonus: 0.1
    const char = makeChar({ fateGrid: 'dragonPhoenix' })
    expect(getBreakthroughSuccessBonus(char)).toBe(0.1)
  })

  it('getBreakthroughExpRetentionRate returns correct value for defiance', () => {
    // defiance: breakthroughExpRetentionRate: 0.6
    const char = makeChar({ fateGrid: 'defiance' })
    expect(getBreakthroughExpRetentionRate(char)).toBe(0.6)
  })

  it('getBreakthroughFailStackBonus returns correct value for defiance', () => {
    // defiance: breakthroughFailStackBonus: 0.05
    const char = makeChar({ fateGrid: 'defiance' })
    expect(getBreakthroughFailStackBonus(char)).toBe(0.05)
  })

  it('getAttackModifier returns correct value for ghostly', () => {
    // ghostly: attackModifier: 0.18
    const char = makeChar({ fateGrid: 'ghostly' })
    expect(getAttackModifier(char)).toBe(0.18)
  })

  it('getRareEventChanceBonus returns correct value for lucky', () => {
    // lucky: rareEventChanceBonus: 0.25
    const char = makeChar({ fateGrid: 'lucky' })
    expect(getRareEventChanceBonus(char)).toBe(0.25)
  })

  it('getLootQualityBonus returns correct value for lucky', () => {
    // lucky: lootQualityBonus: 0.2
    const char = makeChar({ fateGrid: 'lucky' })
    expect(getLootQualityBonus(char)).toBe(0.2)
  })

  it('getTechniqueComprehensionModifier returns correct value for wisdom', () => {
    // wisdom: techniqueComprehensionModifier: 0.2
    const char = makeChar({ fateGrid: 'wisdom' })
    expect(getTechniqueComprehensionModifier(char)).toBe(0.2)
  })

  it('getSuddenInsightChance returns correct value for lucky', () => {
    // lucky: suddenInsightChance: 0.05
    const char = makeChar({ fateGrid: 'lucky' })
    expect(getSuddenInsightChance(char)).toBe(0.05)
  })

  it('getHeartDemonBonus returns correct value for ghostly', () => {
    // ghostly: heartDemonBonus: 0.08
    const char = makeChar({ fateGrid: 'ghostly' })
    expect(getHeartDemonBonus(char)).toBe(0.08)
  })
})

// ---------------------------------------------------------------------------
// FATE_GRIDS data integrity
// ---------------------------------------------------------------------------

describe('FATE_GRIDS data integrity', () => {
  const ALL_GRID_IDS: FateGridId[] = [
    'dragonPhoenix',
    'overlordBody',
    'bloodSuppress',
    'ghostly',
    'undying',
    'lastStand',
    'warSpirit',
    'wisdom',
    'defiance',
    'lucky',
  ]

  it('defines all 10 grids', () => {
    expect(Object.keys(FATE_GRIDS)).toHaveLength(10)
    for (const id of ALL_GRID_IDS) {
      expect(FATE_GRIDS[id]).toBeDefined()
    }
  })

  it('FATE_GRID_LIST contains all 10 grids', () => {
    expect(FATE_GRID_LIST).toHaveLength(10)
    const listIds = FATE_GRID_LIST.map((g) => g.id).sort()
    const expectedIds = [...ALL_GRID_IDS].sort()
    expect(listIds).toEqual(expectedIds)
  })

  it('each grid has correct structure', () => {
    for (const id of ALL_GRID_IDS) {
      const def = FATE_GRIDS[id]
      expect(def.id).toBe(id)
      expect(def.name).toBeTruthy()
      expect(def.description).toBeTruthy()
      expect(def.effects).toBeDefined()
      expect(typeof def.effects).toBe('object')
    }
  })

  it('getFateGridDef returns correct definition for each id', () => {
    for (const id of ALL_GRID_IDS) {
      const def = getFateGridDef(id)
      expect(def).toBe(FATE_GRIDS[id])
    }
  })
})

// ---------------------------------------------------------------------------
// Grid categories
// ---------------------------------------------------------------------------

describe('grid categories', () => {
  const CATEGORY_MAP: Record<FateGridId, FateGridCategory> = {
    dragonPhoenix: 'heavenly',
    overlordBody: 'heavenly',
    bloodSuppress: 'heavenly',
    ghostly: 'ghost',
    undying: 'ghost',
    lastStand: 'emotional',
    warSpirit: 'emotional',
    wisdom: 'cultivation',
    defiance: 'cultivation',
    lucky: 'probability',
  }

  it('each grid has the correct category', () => {
    for (const [id, expectedCategory] of Object.entries(CATEGORY_MAP)) {
      expect(FATE_GRIDS[id as FateGridId].category).toBe(expectedCategory)
    }
  })

  it('has 5 distinct categories', () => {
    const categories = new Set(FATE_GRID_LIST.map((g) => g.category))
    expect(categories.size).toBe(5)
  })
})

// ---------------------------------------------------------------------------
// Grid rarities
// ---------------------------------------------------------------------------

describe('grid rarities', () => {
  const RARITY_MAP: Record<FateGridId, FateGridRarity> = {
    dragonPhoenix: 'epic',
    overlordBody: 'legendary',
    bloodSuppress: 'legendary',
    ghostly: 'rare',
    undying: 'epic',
    lastStand: 'rare',
    warSpirit: 'rare',
    wisdom: 'common',
    defiance: 'epic',
    lucky: 'rare',
  }

  it('each grid has the correct rarity', () => {
    for (const [id, expectedRarity] of Object.entries(RARITY_MAP)) {
      expect(FATE_GRIDS[id as FateGridId].rarity).toBe(expectedRarity)
    }
  })

  it('covers all 4 rarity tiers', () => {
    const rarities = new Set(FATE_GRID_LIST.map((g) => g.rarity))
    expect(rarities.has('common')).toBe(true)
    expect(rarities.has('rare')).toBe(true)
    expect(rarities.has('epic')).toBe(true)
    expect(rarities.has('legendary')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// rollFateGrid
// ---------------------------------------------------------------------------

describe('rollFateGrid', () => {
  const ALL_QUALITIES: CharacterQuality[] = ['common', 'spirit', 'immortal', 'divine', 'chaos']
  const VALID_IDS = new Set<string>([
    'dragonPhoenix',
    'overlordBody',
    'bloodSuppress',
    'ghostly',
    'undying',
    'lastStand',
    'warSpirit',
    'wisdom',
    'defiance',
    'lucky',
  ])

  it('returns a valid FateGridId for each quality', () => {
    for (const quality of ALL_QUALITIES) {
      const result = rollFateGrid(quality)
      expect(VALID_IDS.has(result)).toBe(true)
    }
  })

  it('returns different grids across many rolls (stochastic)', () => {
    const seen = new Set<FateGridId>()
    for (let i = 0; i < 100; i++) {
      seen.add(rollFateGrid('immortal'))
    }
    // With 100 rolls at immortal (high tier), we should see at least several grids
    expect(seen.size).toBeGreaterThan(3)
  })
})

// ---------------------------------------------------------------------------
// BREAKTHROUGH_FATE_GRID_CHANCE
// ---------------------------------------------------------------------------

describe('BREAKTHROUGH_FATE_GRID_CHANCE', () => {
  it('is 0.2', () => {
    expect(BREAKTHROUGH_FATE_GRID_CHANCE).toBe(0.2)
  })
})
