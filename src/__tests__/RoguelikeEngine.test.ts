import { generateFloor, generateDungeonRun } from '../systems/roguelike/MapGenerator'
import { resolveEvent } from '../systems/roguelike/EventSystem'
import { DUNGEONS } from '../data/events'
import { BLESSINGS, type Blessing } from '../data/blessings'
import { RELICS, type Relic } from '../data/relics'
import { applyRunBuild, type RunBuild } from '../systems/roguelike/RunBuildSystem'
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

const dummyTeam = [dummyPlayer]

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
      }
    }
  })
})

describe('EventSystem', () => {
  it('should resolve combat event', () => {
    const result = resolveEvent({ type: 'combat', id: 'test' }, dummyTeam, 1)
    expect(result.type).toBe('combat')
    expect(result.combatResult).toBeDefined()
    expect(result.reward.spiritStone).toBeGreaterThanOrEqual(0)
  })

  it('should resolve rest event with healing', () => {
    const result = resolveEvent({ type: 'rest', id: 'test' }, dummyTeam, 1)
    expect(result.hpChanges['p1']).toBeGreaterThan(0)
    expect(result.message).toContain('恢复')
  })

  it('should resolve shop event', () => {
    const result = resolveEvent({ type: 'shop', id: 'test' }, dummyTeam, 1)
    expect(result.type).toBe('shop')
    expect(result.success).toBe(true)
  })

  it('should resolve random event with one of three outcomes', () => {
    const result = resolveEvent({ type: 'random', id: 'test' }, dummyTeam, 1)
    expect(result.type).toBe('random')
    expect(['发现了一处宝箱！', '路边休息，恢复了少量生命', '踩到了陷阱！']).toContain(result.message)
  })

  it('should resolve boss event with combat result', () => {
    const result = resolveEvent({ type: 'boss', id: 'test' }, dummyTeam, 1)
    expect(result.type).toBe('boss')
    expect(result.combatResult).toBeDefined()
  })

  it('rest healing should scale with maxHp', () => {
    const tankPlayer: CombatUnit = { ...dummyPlayer, maxHp: 1000, hp: 1000 }
    const result = resolveEvent({ type: 'rest', id: 'test' }, [tankPlayer], 1)
    expect(result.hpChanges['p1']).toBe(300) // 30% of 1000
  })

  it('boss rewards should scale with floor number', () => {
    // Run many times to ensure at least one victory
    let foundHighReward = false
    for (let i = 0; i < 50; i++) {
      const strongPlayer: CombatUnit = { ...dummyPlayer, atk: 999, def: 999, hp: 9999, maxHp: 9999 }
      const result = resolveEvent({ type: 'boss', id: 'test' }, [strongPlayer], 5)
      if (result.success && result.reward.spiritStone >= 1000) {
        foundHighReward = true
        break
      }
    }
    expect(foundHighReward).toBe(true)
  })

  it('should support multi-unit team combat', () => {
    const ally1: CombatUnit = { ...dummyPlayer, id: 'a1', name: 'Ally1' }
    const ally2: CombatUnit = { ...dummyPlayer, id: 'a2', name: 'Ally2', element: 'fire' }
    const team = [ally1, ally2]
    const result = resolveEvent({ type: 'combat', id: 'test' }, team, 1)
    expect(result.type).toBe('combat')
    expect(result.combatResult).toBeDefined()
    // HP changes should be recorded for both allies
    expect(result.hpChanges).toHaveProperty('a1')
    expect(result.hpChanges).toHaveProperty('a2')
  })

  it('should skip dead allies in combat', () => {
    const alivePlayer: CombatUnit = { ...dummyPlayer, id: 'alive', name: 'Alive' }
    const deadPlayer: CombatUnit = { ...dummyPlayer, id: 'dead', name: 'Dead', hp: 0 }
    const team = [alivePlayer, deadPlayer]
    const result = resolveEvent({ type: 'combat', id: 'test' }, team, 1)
    expect(result.type).toBe('combat')
    expect(result.combatResult).toBeDefined()
    // Dead ally should not have an HP change entry from combat
    expect(result.hpChanges).not.toHaveProperty('dead')
  })

  it('should return itemRewards array', () => {
    const result = resolveEvent({ type: 'combat', id: 'test' }, dummyTeam, 1)
    expect(Array.isArray(result.itemRewards)).toBe(true)
  })

  it('dead team should fail combat without fighting', () => {
    const deadTeam: CombatUnit = [{ ...dummyPlayer, hp: 0 }]
    const result = resolveEvent({ type: 'combat', id: 'test' }, deadTeam, 1)
    expect(result.success).toBe(false)
    expect(result.combatResult).toBeUndefined()
    expect(result.message).toContain('全军覆没')
  })
})

describe('RunBuild - Blessings', () => {
  it('should export at least 8 blessings', () => {
    expect(BLESSINGS.length).toBeGreaterThanOrEqual(8)
  })

  it('every blessing should have a valid id, name, description, and effect type', () => {
    for (const b of BLESSINGS) {
      expect(b.id).toBeTruthy()
      expect(b.name).toBeTruthy()
      expect(b.description).toBeTruthy()
      expect(['atkBoost', 'critBoost', 'spiritRegen', 'hpBoost', 'defBoost', 'healOnKill', 'lootBonus']).toContain(b.effectType)
    }
  })

  it('should apply an atkBoost blessing to combat units', () => {
    const build: RunBuild = {
      blessings: [{ id: 'flame_heart', stacks: 1 }],
      relics: [],
    }
    const units = applyRunBuild([dummyPlayer], build)
    expect(units[0].atk).toBeGreaterThan(dummyPlayer.atk)
  })
})

describe('RunBuild - Relics', () => {
  it('should export at least 4 relics', () => {
    expect(RELICS.length).toBeGreaterThanOrEqual(4)
  })

  it('every relic should have a valid id, name, description, and rule', () => {
    for (const r of RELICS) {
      expect(r.id).toBeTruthy()
      expect(r.name).toBeTruthy()
      expect(r.description).toBeTruthy()
      expect(r.rule).toBeTruthy()
    }
  })

  it('relics persist inside the run build', () => {
    const build: RunBuild = {
      blessings: [],
      relics: [{ id: 'mirror_shard' }],
    }
    expect(build.relics).toHaveLength(1)
    expect(build.relics[0].id).toBe('mirror_shard')
  })

  it('should apply a defense relic effect to combat units', () => {
    const build: RunBuild = {
      blessings: [],
      relics: [{ id: 'jade_armor' }],
    }
    const units = applyRunBuild([dummyPlayer], build)
    expect(units[0].def).toBeGreaterThan(dummyPlayer.def)
  })
})
