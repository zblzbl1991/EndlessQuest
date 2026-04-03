import { describe, expect, it } from 'vitest'
import type { Character } from '../types'
import { pickAutomationTeam, shouldAutoRecruit } from '../systems/sect/SectAutomationSystem'
import { generateCharacter } from '../systems/character/CharacterEngine'

function makeCharacter(id: string, overrides?: Partial<Character>): Character {
  return {
    ...generateCharacter('common'),
    id,
    recoveryDaysRemaining: 0,
    ...overrides,
  }
}

describe('SectAutomationSystem', () => {
  it('recruits when reserve thresholds are satisfied', () => {
    expect(
      shouldAutoRecruit({
        spiritStone: 500,
        reserveSpiritStone: 300,
        spiritEnergy: 200,
        reserveSpiritEnergy: 120,
      })
    ).toBe(true)

    expect(
      shouldAutoRecruit({
        spiritStone: 300,
        reserveSpiritStone: 300,
        spiritEnergy: 200,
        reserveSpiritEnergy: 120,
      })
    ).toBe(false)
  })

  it('skips recovering and patrolling disciples when auto-building a team', () => {
    const team = pickAutomationTeam(
      [
        makeCharacter('fighter_1', {
          status: 'idle',
          baseStats: { hp: 180, atk: 40, def: 20, spd: 20, crit: 0.1, critDmg: 1.5 },
        }),
        makeCharacter('fighter_2', {
          status: 'idle',
          baseStats: { hp: 160, atk: 35, def: 18, spd: 18, crit: 0.08, critDmg: 1.5 },
        }),
        makeCharacter('recovering_1', {
          status: 'recovering',
          recoveryDaysRemaining: 2,
          baseStats: { hp: 999, atk: 999, def: 999, spd: 999, crit: 0.5, critDmg: 2 },
        }),
        makeCharacter('patrolling_1', {
          status: 'patrolling',
          baseStats: { hp: 999, atk: 999, def: 999, spd: 999, crit: 0.5, critDmg: 2 },
        }),
      ],
      5
    )

    expect(team).toEqual(['fighter_1', 'fighter_2'])
  })
})
