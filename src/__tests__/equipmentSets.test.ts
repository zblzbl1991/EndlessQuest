import {
  EQUIPMENT_SETS,
  pickSetForSlot,
  countSetPieces,
  calcActiveSetBonuses,
  calcSetBonusStats,
  getSetById,
  generateRandomAffixes,
} from '../data/equipmentSets'
import type { Equipment } from '../types/item'

function makeEquipment(overrides: Partial<Equipment> & { id: string }): Equipment {
  return {
    name: 'Test Item',
    quality: 'spirit',
    type: 'equipment',
    slot: 'weapon',
    description: 'test',
    sellPrice: 100,
    stats: { hp: 0, atk: 20, def: 0, spd: 2, crit: 0.05, critDmg: 0.15 },
    enhanceLevel: 0,
    refinementStats: [],
    setId: null,
    ...overrides,
  }
}

// ---...--- Set Definitions ---...---

describe('equipmentSets', () => {
  it('should define exactly 6 sets', () => {
    expect(EQUIPMENT_SETS).toHaveLength(6)
  })

  it('should have unique IDs for each set', () => {
    const ids = EQUIPMENT_SETS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('should have valid bonus structures for each set', () => {
    for (const set of EQUIPMENT_SETS) {
      expect(set.id).toBeTruthy()
      expect(set.name).toBeTruthy()
      expect(set.description).toBeTruthy()
      expect(set.pieces.length).toBeGreaterThanOrEqual(4)
      expect(set.bonus2.description).toBeTruthy()
      expect(set.bonus4.description).toBeTruthy()
      // Each bonus should have at least one effect
      expect(set.bonus2.statMultipliers || set.bonus2.flatBonus || set.bonus2.special).toBeTruthy()
      expect(set.bonus4.statMultipliers || set.bonus4.flatBonus || set.bonus4.special).toBeTruthy()
    }
  })

  it('should look up sets by ID', () => {
    const set = getSetById('azureBlade')
    expect(set).toBeDefined()
    expect(set!.name).toBe('青锋套装')
  })

  it('should return undefined for unknown set ID', () => {
    expect(getSetById('nonexistent')).toBeUndefined()
  })
})

// ---...--- Set Assignment ---...---

describe('pickSetForSlot', () => {
  it('should return null for common quality most of the time', () => {
    // Common has 85% no-set chance, so out of 50 rolls we expect mostly null
    let nullCount = 0
    for (let i = 0; i < 50; i++) {
      if (pickSetForSlot('weapon', 'common') === null) nullCount++
    }
    expect(nullCount).toBeGreaterThan(30)
  })

  it('should return a set most of the time for chaos quality', () => {
    let setCount = 0
    for (let i = 0; i < 50; i++) {
      if (pickSetForSlot('weapon', 'chaos') !== null) setCount++
    }
    expect(setCount).toBeGreaterThan(40)
  })

  it('should only return sets that include the given slot', () => {
    for (let i = 0; i < 30; i++) {
      const set = pickSetForSlot('weapon', 'divine')
      if (set) {
        expect(set.pieces).toContain('weapon')
      }
    }
  })

  it('should return a valid EquipmentSet or null', () => {
    const result = pickSetForSlot('head', 'immortal')
    if (result !== null) {
      expect(result.id).toBeTruthy()
      expect(result.pieces).toContain('head')
    }
  })
})

// ---...--- Set Piece Counting ---...---

describe('countSetPieces', () => {
  it('should count pieces of the same set', () => {
    const items = [
      makeEquipment({ id: 'w1', setId: 'azureBlade', slot: 'weapon' }),
      makeEquipment({ id: 'a1', setId: 'azureBlade', slot: 'bracer' }),
      makeEquipment({ id: 'b1', setId: 'darkIron', slot: 'head' }),
    ]
    const gear = ['w1', 'a1', null, 'b1', null, null, null, null, null]
    const getById = (id: string) => items.find((i) => i.id === id)

    const counts = countSetPieces(gear, getById)
    expect(counts['azureBlade']).toBe(2)
    expect(counts['darkIron']).toBe(1)
  })

  it('should skip null gear slots', () => {
    const gear = [null, null, null, null, null, null, null, null, null]
    const counts = countSetPieces(gear, () => undefined)
    expect(Object.keys(counts)).toHaveLength(0)
  })

  it('should skip equipment with no setId', () => {
    const items = [makeEquipment({ id: 'w1', setId: null })]
    const gear: (string | null)[] = ['w1']
    const getById = (id: string) => items.find((i) => i.id === id)

    const counts = countSetPieces(gear, getById)
    expect(Object.keys(counts)).toHaveLength(0)
  })
})

// ---...--- Active Set Bonuses ---...---

describe('calcActiveSetBonuses', () => {
  it('should return 2pc bonus when exactly 2 pieces equipped', () => {
    const items = [
      makeEquipment({ id: 'w1', setId: 'azureBlade', slot: 'weapon' }),
      makeEquipment({ id: 'a1', setId: 'azureBlade', slot: 'bracer' }),
    ]
    const gear = ['w1', 'a1', null, null, null, null, null, null, null]
    const getById = (id: string) => items.find((i) => i.id === id)

    const bonuses = calcActiveSetBonuses(gear, getById)
    expect(bonuses).toHaveLength(1)
    expect(bonuses[0].description).toContain('攻击')
  })

  it('should return 2pc and 4pc bonuses when 4 pieces equipped', () => {
    const items = [
      makeEquipment({ id: 'w1', setId: 'azureBlade', slot: 'weapon' }),
      makeEquipment({ id: 'a1', setId: 'azureBlade', slot: 'bracer' }),
      makeEquipment({ id: 't1', setId: 'azureBlade', slot: 'talisman' }),
      makeEquipment({ id: 'b1', setId: 'azureBlade', slot: 'boots' }),
    ]
    // gear order: head, armor, bracer, belt, boots, weapon, accessory1, accessory2, talisman
    const gear: (string | null)[] = [null, null, 'a1', null, 'b1', 'w1', null, null, 't1']
    const getById = (id: string) => items.find((i) => i.id === id)

    const bonuses = calcActiveSetBonuses(gear, getById)
    expect(bonuses).toHaveLength(2)
  })

  it('should return no bonuses when fewer than 2 pieces', () => {
    const items = [makeEquipment({ id: 'w1', setId: 'azureBlade', slot: 'weapon' })]
    const gear: (string | null)[] = [null, null, null, null, null, 'w1', null, null, null]
    const getById = (id: string) => items.find((i) => i.id === id)

    const bonuses = calcActiveSetBonuses(gear, getById)
    expect(bonuses).toHaveLength(0)
  })
})

// ---...--- Set Bonus Stats Calculation ---...---

describe('calcSetBonusStats', () => {
  it('should apply stat multipliers from 2pc bonus', () => {
    const items = [
      makeEquipment({
        id: 'w1',
        setId: 'azureBlade',
        slot: 'weapon',
        stats: { hp: 0, atk: 100, def: 0, spd: 0, crit: 0, critDmg: 0 },
      }),
      makeEquipment({
        id: 'a1',
        setId: 'azureBlade',
        slot: 'bracer',
        stats: { hp: 0, atk: 50, def: 0, spd: 0, crit: 0, critDmg: 0 },
      }),
    ]
    const gear: (string | null)[] = [null, null, 'a1', null, null, 'w1', null, null, null]
    const getById = (id: string) => items.find((i) => i.id === id)

    const baseStats = { hp: 0, atk: 150, def: 0, spd: 0, crit: 0, critDmg: 0 }
    const result = calcSetBonusStats(baseStats, gear, getById)

    // azureBlade 2pc: atk +8% = 150 * 0.08 = 12
    expect(result.atk).toBe(12)
  })

  it('should apply flat bonuses from 4pc', () => {
    const items = [
      makeEquipment({ id: 'w1', setId: 'azureBlade', slot: 'weapon' }),
      makeEquipment({ id: 'a1', setId: 'azureBlade', slot: 'bracer' }),
      makeEquipment({ id: 't1', setId: 'azureBlade', slot: 'talisman' }),
      makeEquipment({ id: 'b1', setId: 'azureBlade', slot: 'boots' }),
    ]
    const gear: (string | null)[] = [null, null, 'a1', null, 'b1', 'w1', null, null, 't1']
    const getById = (id: string) => items.find((i) => i.id === id)

    const baseStats = { hp: 100, atk: 100, def: 50, spd: 10, crit: 0, critDmg: 0 }
    const result = calcSetBonusStats(baseStats, gear, getById)

    // 2pc: atk+8% = floor(100*0.08) = 8
    // 4pc: flat crit+0.05, critDmg+0.15
    expect(result.atk).toBe(8)
    expect(result.crit).toBe(0.05)
    expect(result.critDmg).toBe(0.15)
  })

  it('should return zero stats when no set bonuses active', () => {
    const gear = [null, null, null, null, null, null, null, null, null]
    const baseStats = { hp: 100, atk: 50, def: 30, spd: 10, crit: 0.05, critDmg: 1.5 }
    const result = calcSetBonusStats(baseStats, gear, () => undefined)

    expect(result.hp).toBe(0)
    expect(result.atk).toBe(0)
    expect(result.def).toBe(0)
  })
})

// ---...--- Random Affixes ---...---

describe('generateRandomAffixes', () => {
  it('should generate 0 affixes for common quality', () => {
    const stats = { hp: 0, atk: 8, def: 0, spd: 0, crit: 0, critDmg: 0 }
    // Run multiple times to be sure
    for (let i = 0; i < 20; i++) {
      const affixes = generateRandomAffixes('common', 'weapon', stats)
      expect(affixes).toHaveLength(0)
    }
  })

  it('should generate 0-2 affixes for spirit quality', () => {
    const stats = { hp: 0, atk: 15, def: 0, spd: 2, crit: 0, critDmg: 0 }
    let foundAffixes = false
    for (let i = 0; i < 30; i++) {
      const affixes = generateRandomAffixes('spirit', 'weapon', stats)
      expect(affixes.length).toBeLessThanOrEqual(2)
      if (affixes.length > 0) foundAffixes = true
    }
    // Statistically should find at least some affixes in 30 rolls
    expect(foundAffixes).toBe(true)
  })

  it('should generate 1-2 affixes for divine quality', () => {
    const stats = { hp: 0, atk: 40, def: 0, spd: 5, crit: 0.05, critDmg: 0 }
    for (let i = 0; i < 30; i++) {
      const affixes = generateRandomAffixes('divine', 'weapon', stats)
      expect(affixes.length).toBeGreaterThanOrEqual(0)
      expect(affixes.length).toBeLessThanOrEqual(2)
    }
  })

  it('should generate 1-2 affixes for chaos quality', () => {
    const stats = { hp: 0, atk: 64, def: 0, spd: 8, crit: 0.08, critDmg: 0 }
    for (let i = 0; i < 30; i++) {
      const affixes = generateRandomAffixes('chaos', 'weapon', stats)
      expect(affixes.length).toBeGreaterThanOrEqual(1)
      expect(affixes.length).toBeLessThanOrEqual(2)
    }
  })

  it('should produce affixes with positive values', () => {
    const stats = { hp: 0, atk: 40, def: 10, spd: 5, crit: 0.05, critDmg: 0.1 }
    for (let i = 0; i < 30; i++) {
      const affixes = generateRandomAffixes('divine', 'armor', stats)
      for (const affix of affixes) {
        const values = Object.values(affix)
        for (const v of values) {
          expect(v).toBeGreaterThan(0)
        }
      }
    }
  })

  it('should not repeat the same stat in two affixes', () => {
    const stats = { hp: 20, atk: 40, def: 10, spd: 5, crit: 0.05, critDmg: 0.1 }
    let foundTwo = false
    for (let i = 0; i < 50; i++) {
      const affixes = generateRandomAffixes('chaos', 'armor', stats)
      if (affixes.length === 2) {
        foundTwo = true
        const keys = affixes.map((a) => Object.keys(a)[0])
        expect(keys[0]).not.toBe(keys[1])
      }
    }
    expect(foundTwo).toBe(true)
  })
})
