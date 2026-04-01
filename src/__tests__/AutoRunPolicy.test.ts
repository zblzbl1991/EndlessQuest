import { describe, expect, it } from 'vitest'
import { getRunIntentDef } from '../data/runIntents'
import type { AutomationContext } from '../systems/roguelike/AutoRunPolicy'
import {
  getRouteArchetype,
  pickAutomationBlessing,
  pickAutomationRoute,
  shouldAttemptPetCapture,
  shouldRetreat,
} from '../systems/roguelike/AutoRunPolicy'
import type { DungeonFloor } from '../types/adventure'

const floor: DungeonFloor = {
  floor: 2,
  isBossFloor: false,
  routes: [
    {
      id: 'safe',
      name: 'Safe Path',
      description: 'low risk route',
      riskLevel: 'low',
      events: [{ type: 'rest' }, { type: 'combat' }],
      reward: { spiritStone: 60, herb: 6, ore: 1 },
    },
    {
      id: 'rich',
      name: 'Rich Path',
      description: 'high value route',
      riskLevel: 'high',
      events: [{ type: 'combat' }],
      reward: { spiritStone: 120, herb: 18, ore: 3 },
    },
    {
      id: 'battle',
      name: 'Battle Path',
      description: 'combat heavy route',
      riskLevel: 'medium',
      events: [{ type: 'combat' }, { type: 'combat' }, { type: 'rest' }],
      reward: { spiritStone: 90, herb: 8, ore: 2 },
    },
    {
      id: 'mutate',
      name: 'Mutation Path',
      description: 'special event route',
      riskLevel: 'high',
      events: [{ type: 'ancient_cave' }, { type: 'combat' }],
      reward: { spiritStone: 80, herb: 10, ore: 1 },
    },
  ],
}

function makeContext(overrides: Partial<AutomationContext> = {}): AutomationContext {
  return {
    averageHpRatio: 0.75,
    lowestHpRatio: 0.7,
    currentRewards: { spiritStone: 80, spiritEnergy: 0, herb: 5, ore: 1 },
    currentFloor: 2,
    totalFloors: 5,
    blessings: [],
    relics: [],
    ...overrides,
  }
}

describe('AutoRunPolicy', () => {
  it('maps steady/combat/profit to 守成/争锋/寻机 copy', () => {
    expect(getRunIntentDef('steady').label).toBe('守成')
    expect(getRunIntentDef('combat').label).toBe('争锋')
    expect(getRunIntentDef('profit').label).toBe('寻机')
  })

  it('steady picks the lowest-risk route when the team is shaky', () => {
    const routeIndex = pickAutomationRoute('steady', floor, makeContext({ averageHpRatio: 0.42, lowestHpRatio: 0.28 }))
    expect(routeIndex).toBe(0)
  })

  it('profit prefers the highest-value route when the team is stable', () => {
    const routeIndex = pickAutomationRoute('profit', floor, makeContext({ averageHpRatio: 0.95, lowestHpRatio: 0.9 }))
    expect(routeIndex).toBe(1)
  })

  it('classifies routes into readable build archetypes', () => {
    expect(getRouteArchetype(floor.routes[0])).toBe('stable')
    expect(getRouteArchetype(floor.routes[2])).toBe('combat')
    expect(getRouteArchetype(floor.routes[1])).toBe('profit')
    expect(getRouteArchetype(floor.routes[3])).toBe('mutation')
  })

  it('combat prefers combat-oriented routes when it can afford the risk', () => {
    const routeIndex = pickAutomationRoute('combat', floor, makeContext({ averageHpRatio: 0.9, lowestHpRatio: 0.88 }))
    expect(routeIndex).toBe(2)
  })

  it('combat favors battle blessings while profit favors resource blessings', () => {
    expect(pickAutomationBlessing('combat', ['stoneHarvest', 'battleFocus', 'ironBody'])).toBe('battleFocus')
    expect(pickAutomationBlessing('profit', ['stoneHarvest', 'battleFocus', 'ironBody'])).toBe('stoneHarvest')
  })

  it('steady retreats earlier than combat in the same low-hp state', () => {
    const context = makeContext({ averageHpRatio: 0.34, lowestHpRatio: 0.18 })
    expect(shouldRetreat('steady', context)).toBe(true)
    expect(shouldRetreat('combat', context)).toBe(false)
  })

  it('combat is more willing to attempt pet capture than steady', () => {
    const context = makeContext({ averageHpRatio: 0.55, lowestHpRatio: 0.48 })
    expect(shouldAttemptPetCapture('steady', context)).toBe(false)
    expect(shouldAttemptPetCapture('combat', context)).toBe(true)
  })
})
