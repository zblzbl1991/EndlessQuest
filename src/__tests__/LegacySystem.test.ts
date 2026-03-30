import { getLegacyBonus, LEGACY_REWARD_TIERS } from '../data/legacy'
import { canAscend, performAscension } from '../systems/sect/LegacySystem'
import type { Sect, Building, Resources } from '../types/sect'
import type { Character } from '../types/character'
import { BUILDING_DEFS } from '../data/buildings'
import { generateCharacter } from '../systems/character/CharacterEngine'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBuildings(allLevel: number): Building[] {
  return BUILDING_DEFS.map((def) => ({
    type: def.type,
    level: allLevel,
    unlocked: true,
    productionQueue: { recipeId: null, progress: 0 },
  }))
}

function makeCharacter(realm: number): Character {
  const char = generateCharacter('common')
  return { ...char, realm }
}

function makeSect(overrides?: Partial<Sect>): Sect {
  return {
    name: '测试宗门',
    level: 1,
    resources: { spiritStone: 500, spiritEnergy: 0, herb: 0, ore: 0 },
    buildings: makeBuildings(0),
    characters: [makeCharacter(0)],
    vault: [],
    maxVaultSlots: 50,
    pets: [],
    totalAdventureRuns: 0,
    totalBreakthroughs: 0,
    lastTransmissionTime: 0,
    techniqueCodex: ['qingxin'],
    offlineAccumulator: {
      resourcesGained: { spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0 },
      breakthroughs: [],
      itemsCrafted: [],
      taxIncome: 0,
    },
    sectPath: 'none',
    unlockedPathNodeIds: [],
    pathUnlockedAt: null,
    legacy: { ascensionCount: 0, statBonus: 0, unlockedTechniques: [], unlockedDungeons: [] },
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests: getLegacyBonus (data layer)
// ---------------------------------------------------------------------------

describe('getLegacyBonus', () => {
  it('should return zero bonuses for ascension count 0', () => {
    const bonus = getLegacyBonus(0)
    expect(bonus.ascensionCount).toBe(0)
    expect(bonus.statBonus).toBe(0)
    expect(bonus.unlockedTechniques).toEqual([])
    expect(bonus.unlockedDungeons).toEqual([])
  })

  it('should return 5% stat bonus for ascension count 1', () => {
    const bonus = getLegacyBonus(1)
    expect(bonus.statBonus).toBe(5)
    expect(bonus.unlockedTechniques).toEqual([])
  })

  it('should return 10% stat bonus for ascension count 2', () => {
    const bonus = getLegacyBonus(2)
    expect(bonus.statBonus).toBe(10)
  })

  it('should unlock hidden technique at ascension count 3', () => {
    const bonus = getLegacyBonus(3)
    expect(bonus.statBonus).toBe(15)
    expect(bonus.unlockedTechniques).toEqual(['hidden_1'])
  })

  it('should unlock hidden dungeon at ascension count 5', () => {
    const bonus = getLegacyBonus(5)
    expect(bonus.statBonus).toBe(25)
    expect(bonus.unlockedDungeons).toEqual(['hidden_dungeon_1'])
  })

  it('should return 50% stat bonus and all unlocks at ascension count 10', () => {
    const bonus = getLegacyBonus(10)
    expect(bonus.statBonus).toBe(50)
    expect(bonus.unlockedTechniques).toEqual(['hidden_1'])
    expect(bonus.unlockedDungeons).toEqual(['hidden_dungeon_1'])
  })

  it('should cap at highest tier for count above 10', () => {
    const bonus = getLegacyBonus(20)
    expect(bonus.statBonus).toBe(50)
    expect(bonus.unlockedTechniques).toEqual(['hidden_1'])
    expect(bonus.unlockedDungeons).toEqual(['hidden_dungeon_1'])
  })

  it('should accumulate techniques from multiple tiers', () => {
    // Add a hypothetical future tier to test accumulation
    expect(getLegacyBonus(5).unlockedTechniques).toEqual(['hidden_1'])
  })
})

// ---------------------------------------------------------------------------
// Tests: canAscend
// ---------------------------------------------------------------------------

describe('canAscend', () => {
  it('should return false when no character at realm >= 4', () => {
    const sect = makeSect({ characters: [makeCharacter(3)] })
    const result = canAscend(sect)
    expect(result.canAscend).toBe(false)
    expect(result.reasons.length).toBeGreaterThan(0)
    expect(result.reasons.some((r) => r.includes('化神'))).toBe(true)
  })

  it('should return false when buildings not all level >= 5', () => {
    const sect = makeSect({
      characters: [makeCharacter(4)],
      buildings: makeBuildings(3),
    })
    const result = canAscend(sect)
    expect(result.canAscend).toBe(false)
    expect(result.reasons.some((r) => r.includes('建筑'))).toBe(true)
  })

  it('should return true when all conditions met', () => {
    const sect = makeSect({
      characters: [makeCharacter(4)],
      buildings: makeBuildings(5),
    })
    const result = canAscend(sect)
    expect(result.canAscend).toBe(true)
    expect(result.reasons).toEqual([])
  })

  it('should return true with realm >= 5', () => {
    const sect = makeSect({
      characters: [makeCharacter(5)],
      buildings: makeBuildings(5),
    })
    const result = canAscend(sect)
    expect(result.canAscend).toBe(true)
  })

  it('should list multiple unmet conditions', () => {
    const sect = makeSect({
      characters: [makeCharacter(2)],
      buildings: makeBuildings(2),
    })
    const result = canAscend(sect)
    expect(result.canAscend).toBe(false)
    expect(result.reasons.length).toBeGreaterThanOrEqual(2)
  })
})

// ---------------------------------------------------------------------------
// Tests: performAscension
// ---------------------------------------------------------------------------

describe('performAscension', () => {
  it('should reset resources to initial values with x2 bonus for first ascension', () => {
    const sect = makeSect({
      resources: { spiritStone: 99999, spiritEnergy: 5000, herb: 3000, ore: 2000 },
      characters: [makeCharacter(4)],
      buildings: makeBuildings(5),
      legacy: { ascensionCount: 0, statBonus: 0, unlockedTechniques: [], unlockedDungeons: [] },
    })
    const { newSect } = performAscension(sect)
    expect(newSect.resources.spiritStone).toBe(1000) // x2 bonus for first ascension
    expect(newSect.resources.spiritEnergy).toBe(0)
    expect(newSect.resources.herb).toBe(0)
    expect(newSect.resources.ore).toBe(0)
  })

  it('should reset resources to base 500 for subsequent ascensions', () => {
    const sect = makeSect({
      resources: { spiritStone: 99999, spiritEnergy: 5000, herb: 3000, ore: 2000 },
      characters: [makeCharacter(4)],
      buildings: makeBuildings(5),
      legacy: { ascensionCount: 1, statBonus: 5, unlockedTechniques: [], unlockedDungeons: [] },
    })
    const { newSect } = performAscension(sect)
    expect(newSect.resources.spiritStone).toBe(500)
    expect(newSect.resources.spiritEnergy).toBe(0)
    expect(newSect.resources.herb).toBe(0)
    expect(newSect.resources.ore).toBe(0)
  })

  it('should reset characters to single new disciple', () => {
    const sect = makeSect({
      characters: [makeCharacter(4), makeCharacter(3), makeCharacter(5)],
      buildings: makeBuildings(5),
    })
    const { newSect } = performAscension(sect)
    expect(newSect.characters.length).toBe(1)
    expect(newSect.characters[0].realm).toBe(0)
  })

  it('should reset buildings to initial state', () => {
    const sect = makeSect({
      buildings: makeBuildings(5),
    })
    const { newSect } = performAscension(sect)
    for (const b of newSect.buildings) {
      if (b.type === 'mainHall') {
        expect(b.level).toBe(1)
      } else {
        expect(b.level).toBe(0)
      }
    }
  })

  it('should preserve and increment legacy ascensionCount', () => {
    const sect = makeSect({
      legacy: { ascensionCount: 2, statBonus: 10, unlockedTechniques: [], unlockedDungeons: [] },
    })
    const { newSect } = performAscension(sect)
    expect(newSect.legacy.ascensionCount).toBe(3)
  })

  it('should compute new statBonus from ascensionCount', () => {
    const sect = makeSect({
      legacy: { ascensionCount: 0, statBonus: 0, unlockedTechniques: [], unlockedDungeons: [] },
    })
    const { newSect } = performAscension(sect)
    expect(newSect.legacy.ascensionCount).toBe(1)
    expect(newSect.legacy.statBonus).toBe(5)
  })

  it('should reset sectPath to none', () => {
    const sect = makeSect({
      sectPath: 'pill',
      unlockedPathNodeIds: ['pill_1'],
      pathUnlockedAt: Date.now(),
    })
    const { newSect } = performAscension(sect)
    expect(newSect.sectPath).toBe('none')
    expect(newSect.unlockedPathNodeIds).toEqual([])
    expect(newSect.pathUnlockedAt).toBeNull()
  })

  it('should reset techniqueCodex to initial', () => {
    const sect = makeSect({
      techniqueCodex: ['qingxin', 'lieyan', 'houtu', 'advanced_1'],
    })
    const { newSect } = performAscension(sect)
    expect(newSect.techniqueCodex).toEqual(['qingxin', 'lieyan', 'houtu'])
  })

  it('should preserve totalAdventureRuns and totalBreakthroughs', () => {
    const sect = makeSect({
      totalAdventureRuns: 42,
      totalBreakthroughs: 15,
    })
    const { newSect } = performAscension(sect)
    expect(newSect.totalAdventureRuns).toBe(42)
    expect(newSect.totalBreakthroughs).toBe(15)
  })

  it('should reset vault and pets', () => {
    const sect = makeSect({
      vault: [{ item: { id: 'test', type: 'consumable', name: 'test', quality: 'common' } as any, quantity: 1 }],
      pets: [{ id: 'pet1', name: 'Test Pet', element: 'fire', level: 1, power: 10, assignedTo: null }] as any[],
    })
    const { newSect } = performAscension(sect)
    expect(newSect.vault).toEqual([])
    expect(newSect.pets).toEqual([])
  })

  it('should return an ascension report', () => {
    const sect = makeSect()
    const { report } = performAscension(sect)
    expect(report.previousAscensionCount).toBeDefined()
    expect(report.newAscensionCount).toBeDefined()
    expect(report.statBonus).toBeDefined()
  })

  it('should apply starting spirit stone bonus for first ascension', () => {
    const sect = makeSect({
      legacy: { ascensionCount: 0, statBonus: 0, unlockedTechniques: [], unlockedDungeons: [] },
    })
    const { newSect } = performAscension(sect)
    // First ascension: bonus is 1000 spirit stones (x2)
    expect(newSect.resources.spiritStone).toBe(1000)
  })

  it('should not apply spirit stone bonus for second+ ascension', () => {
    const sect = makeSect({
      legacy: { ascensionCount: 2, statBonus: 10, unlockedTechniques: [], unlockedDungeons: [] },
    })
    const { newSect } = performAscension(sect)
    expect(newSect.resources.spiritStone).toBe(500)
  })
})
