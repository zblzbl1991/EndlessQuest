import { describe, expect, it } from 'vitest'
import { createInitialState } from '../stores/sectStore/initial'
import type { Character } from '../types/character'
import { getSectCharacterStatusSummary } from '../systems/sect/SectInsightSystem'

function cloneCharacter(base: Character, overrides: Partial<Character>): Character {
  const cloned = structuredClone(base)
  return {
    ...cloned,
    ...overrides,
    baseStats: overrides.baseStats ?? { ...cloned.baseStats },
    cultivationStats: overrides.cultivationStats ?? { ...cloned.cultivationStats },
  }
}

describe('SectInsightSystem', () => {
  it('separates character statuses into cultivation, dispatch, adventure, training, and recovery', () => {
    const sect = createInitialState().sect
    const base = sect.characters[0]

    sect.characters = [
      cloneCharacter(base, { id: 'idle', name: '甲', status: 'idle' }),
      cloneCharacter(base, { id: 'dispatch', name: '乙', status: 'patrolling' }),
      cloneCharacter(base, { id: 'adventure', name: '丙', status: 'adventuring' }),
      cloneCharacter(base, { id: 'training', name: '丁', status: 'training', assignedBuilding: 'spiritField' }),
      cloneCharacter(base, { id: 'recover', name: '戊', status: 'injured', injuryTimer: 30 }),
    ]

    expect(getSectCharacterStatusSummary(sect.characters)).toEqual([
      { key: 'cultivating', label: '修炼中', count: 1 },
      { key: 'dispatching', label: '派遣中', count: 1 },
      { key: 'adventuring', label: '秘境中', count: 1 },
      { key: 'training', label: '研习中', count: 1 },
      { key: 'recovering', label: '恢复中', count: 1 },
    ])
  })
})
