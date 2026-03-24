import { calcCultivationRate, calcSpiritCostPerSecond, canCultivate, tick, canBreakthrough, breakthrough } from '../systems/cultivation/CultivationEngine'
import type { Player } from '../types/player'

function createPlayer(overrides?: Partial<Player>): Player {
  return {
    id: '1', name: 'test', realm: 0, realmStage: 0, cultivation: 0,
    baseStats: { hp: 100, atk: 15, def: 8, spd: 10, crit: 0.05, critDmg: 1.5 },
    cultivationStats: { spiritPower: 50, maxSpiritPower: 50, comprehension: 10, spiritualRoot: 10, fortune: 5 },
    equippedTechniques: [null, null, null],
    equippedSkills: [null, null, null, null, null],
    equippedGear: [null, null, null, null, null, null, null, null, null],
    partyPets: [null, null], partyDisciple: null,
    ...overrides,
  }
}

describe('CultivationEngine', () => {
  it('should return base cultivation rate of 5/s', () => {
    const player = createPlayer()
    expect(calcCultivationRate(player)).toBe(5)
  })

  it('should apply spiritual root bonus (+2% per point above 10)', () => {
    const player = createPlayer({ cultivationStats: { ...createPlayer().cultivationStats, spiritualRoot: 15 } })
    // base 10 → +0%, 15 → +10%
    expect(calcCultivationRate(player)).toBe(5 * 1.1)
  })

  it('should reduce rate for higher realms', () => {
    const player = createPlayer({ realm: 2 }) // 金丹 = 0.8x
    expect(calcCultivationRate(player)).toBe(5 * 0.8)
  })

  it('should cost 2 spirit energy per second', () => {
    expect(calcSpiritCostPerSecond()).toBe(2)
  })

  it('should not cultivate without enough spirit energy', () => {
    const player = createPlayer()
    const result = tick(player, 1, 1) // only 1 spirit energy, need 2
    expect(result.cultivationGained).toBe(0)
    expect(result.spiritSpent).toBe(0)
  })

  it('should accumulate cultivation with enough spirit energy', () => {
    const player = createPlayer()
    const result = tick(player, 10, 1)
    expect(result.cultivationGained).toBe(5)
    expect(result.spiritSpent).toBe(2)
  })

  it('should not breakthrough without enough cultivation', () => {
    const player = createPlayer({ cultivation: 50 }) // need 100 for first stage
    expect(canBreakthrough(player)).toBe(false)
  })

  it('should breakthrough when enough cultivation', () => {
    const player = createPlayer({ cultivation: 100 })
    expect(canBreakthrough(player)).toBe(true)
  })

  it('should apply stat growth on sub-level breakthrough', () => {
    const player = createPlayer({ cultivation: 100 })
    const result = breakthrough(player)
    expect(result.success).toBe(true)
    expect(result.newRealm).toBe(0)
    expect(result.newStage).toBe(1)
    expect(result.newStats.hp).toBeGreaterThan(result.oldStats.hp)
  })

  it('should apply ×1.8 stat growth on major realm breakthrough', () => {
    // realm 0 stage 3 (圆满) → realm 1 stage 0
    const player = createPlayer({ realm: 0, realmStage: 3, cultivation: 1000 })
    const result = breakthrough(player)
    expect(result.success).toBe(true)
    expect(result.newRealm).toBe(1)
    expect(result.newStage).toBe(0)
    expect(result.newStats.hp).toBe(Math.floor(result.oldStats.hp * 1.8))
  })

  it('should fail breakthrough when insufficient cultivation', () => {
    const player = createPlayer({ cultivation: 50 })
    const result = breakthrough(player)
    expect(result.success).toBe(false)
  })
})
