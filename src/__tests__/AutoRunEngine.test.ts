import { describe, expect, it } from 'vitest'
import type { CombatUnit } from '../systems/combat/CombatEngine'
import type { EventResult } from '../systems/roguelike/EventSystem'
import { resolveAutomatedRun } from '../systems/roguelike/AutoRunEngine'
import type { Dungeon, DungeonRun, DungeonEvent } from '../types/adventure'

function makeUnit(overrides: Partial<CombatUnit> = {}): CombatUnit {
  return {
    id: 'char_1',
    name: '柳清风',
    team: 'ally',
    hp: 100,
    maxHp: 100,
    atk: 20,
    def: 10,
    spd: 12,
    crit: 0.05,
    critDmg: 1.5,
    element: 'neutral',
    spiritPower: 30,
    maxSpiritPower: 30,
    skills: [],
    skillCooldowns: [],
    affixes: [],
    preset: 'balanced',
    aggro: 0,
    shield: 0,
    ...overrides,
  }
}

function makeRun(): DungeonRun {
  return {
    id: 'run_1',
    dungeonId: 'lingCaoValley',
    teamCharacterIds: ['char_1'],
    currentFloor: 1,
    floors: [
      {
        floor: 1,
        isBossFloor: false,
        routes: [
          {
            id: 'route_1',
            name: '前山',
            description: '安全路线',
            riskLevel: 'low',
            events: [{ type: 'combat' }, { type: 'random' }],
            reward: { spiritStone: 40, herb: 6, ore: 0 },
          },
        ],
      },
      {
        floor: 2,
        isBossFloor: true,
        routes: [
          {
            id: 'route_2',
            name: '洞府深处',
            description: '首领房间',
            riskLevel: 'medium',
            events: [{ type: 'boss' }],
            reward: { spiritStone: 100, herb: 0, ore: 2 },
          },
        ],
      },
    ],
    memberStates: {
      char_1: { currentHp: 100, maxHp: 100, status: 'alive' },
    },
    totalRewards: { spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0 },
    itemRewards: [],
    eventLog: [{ timestamp: 1, message: '进入灵草谷' }],
    status: 'active',
    supplyLevel: 'basic',
    rewardMultiplier: 1,
    pendingShopOffers: [],
    tacticalPreset: 'balanced',
    blessings: [],
    relics: [],
    branchTags: [],
    pendingBlessingOptions: [],
  }
}

const dungeon: Dungeon = {
  id: 'lingCaoValley',
  name: '灵草谷',
  totalLayers: 2,
  eventsPerLayer: 2,
  unlockRealm: 0,
  unlockStage: 0,
}

function successfulEvent(type: DungeonEvent['type'], hpDelta = -10): EventResult {
  return {
    type,
    success: true,
    reward: { spiritStone: type === 'boss' ? 120 : 30, herb: type === 'random' ? 6 : 0, ore: 0 },
    itemRewards: [],
    message: `${type} resolved`,
    hpChanges: { char_1: hpDelta },
  }
}

describe('AutoRunEngine', () => {
  it('resolves a dungeon instantly into a completed report', () => {
    const report = resolveAutomatedRun({
      run: makeRun(),
      dungeon,
      automationStrategy: 'steady',
      baseTeamUnits: [makeUnit()],
      now: (() => {
        let tick = 1_000
        return () => ++tick
      })(),
      resolveEventFn: (event) => successfulEvent(event.type),
      pickBlessingOptionsFn: () => [],
      pickRelicRewardFn: () => null,
      petCaptureFn: () => ({ attempted: false, success: false }),
    })

    expect(report.result).toBe('completed')
    expect(report.floorsCleared).toBe(2)
    expect(report.steps[0]?.type).toBe('run_started')
    expect(report.steps.some((step) => step.type === 'route_selected')).toBe(true)
    expect(report.steps.at(-1)?.type).toBe('run_completed')
    expect(report.finishedAt).toBeGreaterThanOrEqual(report.startedAt)
    expect(report.rewards.spiritStone).toBeGreaterThan(0)
  })

  it('can stop early with a retreat report when the policy decides to bail out', () => {
    const report = resolveAutomatedRun({
      run: makeRun(),
      dungeon,
      automationStrategy: 'steady',
      baseTeamUnits: [makeUnit()],
      now: (() => {
        let tick = 2_000
        return () => ++tick
      })(),
      resolveEventFn: (event) => successfulEvent(event.type, event.type === 'combat' ? -85 : 0),
      pickBlessingOptionsFn: () => [],
      pickRelicRewardFn: () => null,
      petCaptureFn: () => ({ attempted: false, success: false }),
    })

    expect(report.result).toBe('retreated')
    expect(report.steps.some((step) => step.type === 'run_retreated')).toBe(true)
    expect(report.floorsCleared).toBe(1)
    expect(report.finalMemberStates.char_1.currentHp).toBe(15)
  })
})
