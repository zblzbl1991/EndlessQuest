import { describe, it, expect, vi, afterEach } from 'vitest'
import { BREAKTHROUGH_COSTS, REALMS } from '../data/realms'
import { calcSpiritStoneCap } from '../systems/economy/ResourceEngine'
import { getRealmStoneFloor } from '../data/realms'
import { shouldTriggerTribulation, resolveTribulation } from '../systems/cultivation/TribulationSystem'
import { processBreakthrough } from '../systems/cultivation/BreakthroughCoordinator'
import { createCharacterCombatUnit } from '../data/enemies'
import type { Character } from '../types/character'

function createCharacter(overrides?: Partial<Character>): Character {
  return {
    id: '1',
    name: 'test',
    title: 'disciple',
    quality: 'common',
    realm: 0,
    realmStage: 0,
    cultivation: 100,
    baseStats: { hp: 100, atk: 15, def: 8, spd: 10, crit: 0.05, critDmg: 1.5 },
    cultivationStats: {
      spiritPower: 50,
      maxSpiritPower: 50,
      comprehension: 10,
      spiritualRoot: 10,
      fortune: 5,
    },
    learnedTechniques: [],
    equippedGear: [null, null, null, null, null, null, null, null, null],
    equippedSkills: [null, null, null, null, null],
    backpack: [],
    maxBackpackSlots: 20,
    petIds: [],
    talents: [],
    status: 'idle',
    injuryTimer: 0,
    createdAt: Date.now(),
    totalCultivation: 0,
    specialties: [],
    assignedBuilding: null,
    cultivationPath: 'sword',
    investedSpiritStone: 0,
    techniqueComprehension: {},
    ...overrides,
  }
}

// ─── B1: final breakthrough must be affordable within the stone hard cap ───

describe('B1: spirit stone cap vs final breakthrough cost', () => {
  it('main hall max level hard cap covers the final breakthrough cost with margin', () => {
    const hardCapAtMax = Math.max(calcSpiritStoneCap(10) * 5, getRealmStoneFloor(8))
    const finalCost = BREAKTHROUGH_COSTS[8].spiritStone
    expect(hardCapAtMax).toBeGreaterThanOrEqual(finalCost)
    // linkage assertion: cost stays within 90% of the reachable hard cap
    expect(finalCost).toBeLessThanOrEqual(hardCapAtMax * 0.9)
  })

  it('cap is strictly increasing across main hall levels', () => {
    for (let lv = 1; lv < 10; lv++) {
      expect(calcSpiritStoneCap(lv + 1)).toBeGreaterThan(calcSpiritStoneCap(lv))
    }
  })

  it('keeps low-level caps unchanged for early-game economy', () => {
    expect(calcSpiritStoneCap(1)).toBe(8000)
    expect(calcSpiritStoneCap(2)).toBe(11000)
  })
})

// ─── B3: every late major realm triggers tribulation ────────────────

describe('B3: tribulation reachability', () => {
  it('all major-realm targets with tribulationPower trigger tribulation', () => {
    // ->筑基 has no tribulation
    expect(shouldTriggerTribulation(0, 3)).toBe(false)
    // ->金丹 / ->元婴 / ->化神 / ->渡劫 all trigger (化神/渡劫 were dead data before)
    expect(shouldTriggerTribulation(1, 3)).toBe(true)
    expect(shouldTriggerTribulation(2, 3)).toBe(true)
    expect(shouldTriggerTribulation(3, 3)).toBe(true)
    expect(shouldTriggerTribulation(4, 3)).toBe(true)
  })

  it('minor breakthroughs never trigger tribulation', () => {
    for (let realm = 0; realm < REALMS.length; realm++) {
      for (let stage = 0; stage < 3; stage++) {
        expect(shouldTriggerTribulation(realm, stage)).toBe(false)
      }
    }
  })

  it('化神 and 渡劫 define tribulationPower for resolveTribulation', () => {
    expect(REALMS[4].tribulationPower).toBeGreaterThan(0)
    expect(REALMS[5].tribulationPower).toBeGreaterThan(0)
  })

  it('resolveTribulation resolves success and failure outcomes', () => {
    const char = createCharacter({ realm: 4, realmStage: 3 })
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    expect(resolveTribulation(char).success).toBe(true)

    vi.mocked(Math.random).mockReset()
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.0) // fail roll: 0 < failRate
      .mockReturnValueOnce(0.05) // severe roll: severe failure
    const failed = resolveTribulation(char)
    expect(failed.success).toBe(false)
    expect(failed.severe).toBe(true)
    expect(failed.injuryTimer).toBe(120)
  })
})

// ─── de-stack: tribulation roll must not be doubled by the engine roll ───

describe('tribulation failure roll is not stacked', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('major breakthrough with tribulation success performs no second failure roll', () => {
    const char = createCharacter({ realm: 4, realmStage: 3, cultivation: 6e12 }) // 化神圆满 need 5e12
    // random sequence: tribulation roll 0.9 (success), gradient roll 0.15 (success),
    // then 0.2. With the old stacked path, 0.2 would be consumed by the engine-layer
    // calcBreakthroughFailureRate (~35%) and silently reject the breakthrough --
    // de-stacked, that roll belongs to the comprehension gate and is harmless.
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.9)
      .mockReturnValueOnce(0.15)
      .mockReturnValueOnce(0.2)
      .mockReturnValue(0.99)

    const result = processBreakthrough(
      char,
      1e40,
      999999,
      [],
      { spiritStone: 0, spiritEnergy: 0 },
      undefined,
      undefined,
      9999
    )

    expect(result.outcome === 'great_success' || result.outcome === 'success').toBe(true)
    expect(result.updatedChar.realm).toBe(5)
    expect(result.successesCount).toBe(1)
  })
})

// ─── B2: legacy statBonus enters the combat stat pipeline ───────────

describe('B2: legacy statBonus multiplies combat stats', () => {
  it('statBonus scales hp/atk/def/spd of the combat unit', () => {
    const char = createCharacter()
    const base = createCharacterCombatUnit(char, [], undefined, undefined, 0)
    const boosted = createCharacterCombatUnit(char, [], undefined, undefined, 50)

    expect(boosted.hp).toBe(Math.floor(base.hp * 1.5))
    expect(boosted.atk).toBe(Math.floor(base.atk * 1.5))
    expect(boosted.def).toBe(Math.floor(base.def * 1.5))
    expect(boosted.spd).toBe(Math.floor(base.spd * 1.5))
  })

  it('zero statBonus leaves stats untouched', () => {
    const char = createCharacter()
    const legacyFree = createCharacterCombatUnit(char, [])
    const explicitZero = createCharacterCombatUnit(char, [], undefined, undefined, 0)

    expect(explicitZero.hp).toBe(legacyFree.hp)
    expect(explicitZero.atk).toBe(legacyFree.atk)
  })
})
