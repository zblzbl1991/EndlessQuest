import { generateFloor, generateDungeonRun } from '../systems/roguelike/MapGenerator'
import { resolveEvent } from '../systems/roguelike/EventSystem'
import { DUNGEONS } from '../data/events'
import type { CombatUnit } from '../systems/combat/CombatEngine'

const dummyPlayer: CombatUnit = {
  id: 'p1',
  name: 'Player',
  team: 'ally',
  hp: 100,
  maxHp: 100,
  atk: 20,
  def: 10,
  spd: 10,
  crit: 0.05,
  critDmg: 1.5,
  element: 'lightning',
  spiritPower: 50,
  maxSpiritPower: 50,
  skills: [],
  skillCooldowns: [],
}

describe('Roguelike MapGenerator', () => {
  it('should generate correct number of floors', () => {
    const dungeon = DUNGEONS[0] // 灵草谷, 5 layers
    const run = generateDungeonRun(dungeon)
    expect(run).toHaveLength(5)
    expect(run[0].floor).toBe(1)
    expect(run[4].floor).toBe(5)
    expect(run[4].isBossFloor).toBe(true)
  })

  it('should generate routes with events on non-boss floors', () => {
    const dungeon = DUNGEONS[0]
    const floor = generateFloor(dungeon, 2)
    expect(floor.isBossFloor).toBe(false)
    expect(floor.routes.length).toBeGreaterThanOrEqual(2)
    expect(floor.routes[0].events.length).toBe(3)
  })

  it('boss floor should have exactly one boss route', () => {
    const dungeon = DUNGEONS[0]
    const floor = generateFloor(dungeon, 5)
    expect(floor.routes).toHaveLength(1)
    expect(floor.routes[0].events[0].type).toBe('boss')
  })

  it('should not place boss events on non-boss floors', () => {
    const dungeon = DUNGEONS[0]
    const run = generateDungeonRun(dungeon)
    for (const floor of run) {
      if (!floor.isBossFloor) {
        for (const route of floor.routes) {
          for (const event of route.events) {
            expect(event.type).not.toBe('boss')
          }
        }
      }
    }
  })

  it('should generate different dungeons with correct layer counts', () => {
    expect(generateDungeonRun(DUNGEONS[1])).toHaveLength(8) // 落云洞
    expect(generateDungeonRun(DUNGEONS[2])).toHaveLength(10) // 血魔渊
    expect(generateDungeonRun(DUNGEONS[5])).toHaveLength(20) // 天劫秘境
  })

  it('routes should have valid risk levels', () => {
    const dungeon = DUNGEONS[0]
    const run = generateDungeonRun(dungeon)
    for (const floor of run) {
      if (!floor.isBossFloor) {
        for (const route of floor.routes) {
          expect(['low', 'medium', 'high']).toContain(route.riskLevel)
        }
      }
    }
  })

  it('routes should have non-negative rewards', () => {
    const dungeon = DUNGEONS[0]
    const run = generateDungeonRun(dungeon)
    for (const floor of run) {
      for (const route of floor.routes) {
        expect(route.reward.spiritStone).toBeGreaterThanOrEqual(0)
        expect(route.reward.herb).toBeGreaterThanOrEqual(0)
        expect(route.reward.ore).toBeGreaterThanOrEqual(0)
        expect(route.reward.fairyJade).toBeGreaterThanOrEqual(0)
      }
    }
  })
})

describe('EventSystem', () => {
  it('should resolve combat event', () => {
    const result = resolveEvent({ type: 'combat', id: 'test' }, dummyPlayer, 1)
    expect(result.type).toBe('combat')
    expect(result.combatResult).toBeDefined()
    expect(result.reward.spiritStone).toBeGreaterThanOrEqual(0)
  })

  it('should resolve rest event with healing', () => {
    const result = resolveEvent({ type: 'rest', id: 'test' }, dummyPlayer, 1)
    expect(result.hpChange).toBeGreaterThan(0)
    expect(result.message).toContain('恢复')
  })

  it('should resolve shop event', () => {
    const result = resolveEvent({ type: 'shop', id: 'test' }, dummyPlayer, 1)
    expect(result.type).toBe('shop')
    expect(result.success).toBe(true)
  })

  it('should resolve random event with one of three outcomes', () => {
    const result = resolveEvent({ type: 'random', id: 'test' }, dummyPlayer, 1)
    expect(result.type).toBe('random')
    expect(['发现了一处宝箱！', '路边休息，恢复了少量生命', '踩到了陷阱！']).toContain(result.message)
  })

  it('should resolve boss event with combat result', () => {
    const result = resolveEvent({ type: 'boss', id: 'test' }, dummyPlayer, 1)
    expect(result.type).toBe('boss')
    expect(result.combatResult).toBeDefined()
  })

  it('rest healing should scale with maxHp', () => {
    const tankPlayer: CombatUnit = { ...dummyPlayer, maxHp: 1000, hp: 1000 }
    const result = resolveEvent({ type: 'rest', id: 'test' }, tankPlayer, 1)
    expect(result.hpChange).toBe(300) // 30% of 1000
  })

  it('boss rewards should include fairyJade at floor 3+', () => {
    // Run many times to ensure at least one victory
    let foundJadeReward = false
    for (let i = 0; i < 50; i++) {
      const strongPlayer: CombatUnit = { ...dummyPlayer, atk: 999, def: 999, hp: 9999, maxHp: 9999 }
      const result = resolveEvent({ type: 'boss', id: 'test' }, strongPlayer, 5)
      if (result.success && result.reward.fairyJade > 0) {
        foundJadeReward = true
        break
      }
    }
    expect(foundJadeReward).toBe(true)
  })
})
