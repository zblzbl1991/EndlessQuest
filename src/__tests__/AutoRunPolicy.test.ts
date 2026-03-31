import { describe, expect, it } from 'vitest'
import type { AutomationContext } from '../systems/roguelike/AutoRunPolicy'
import {
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
      name: '山径',
      description: '低风险路线',
      riskLevel: 'low',
      events: [{ type: 'combat' }],
      reward: { spiritStone: 60, herb: 6, ore: 1 },
    },
    {
      id: 'rich',
      name: '药圃',
      description: '高收益路线',
      riskLevel: 'high',
      events: [{ type: 'combat' }],
      reward: { spiritStone: 120, herb: 18, ore: 3 },
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
  it('steady picks the lowest-risk route when the team is shaky', () => {
    const routeIndex = pickAutomationRoute('steady', floor, makeContext({ averageHpRatio: 0.42, lowestHpRatio: 0.28 }))
    expect(routeIndex).toBe(0)
  })

  it('profit prefers the highest-value route when the team is stable', () => {
    const routeIndex = pickAutomationRoute('profit', floor, makeContext({ averageHpRatio: 0.95, lowestHpRatio: 0.9 }))
    expect(routeIndex).toBe(1)
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
