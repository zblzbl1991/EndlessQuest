import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applyCharacterExperience } from '../data/levelSystem'
import { useSectStore } from '../stores/sectStore'
import { useGameStore } from '../stores/gameStore'
import { useAdventureStore } from '../stores/adventureStore'
import { useEventLogStore } from '../stores/eventLogStore'

describe('character level system', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    useSectStore.getState().reset()
    useGameStore.getState().reset()
    useAdventureStore.getState().reset()
    useEventLogStore.getState().reset()
  })

  it('applies permanent stat growth when experience causes a level up', () => {
    const baseCharacter = useSectStore.getState().sect.characters[0]
    const result = applyCharacterExperience(
      {
        ...baseCharacter,
        quality: 'common',
        realm: 0,
        level: 1,
        xp: 95,
        baseStats: {
          ...baseCharacter.baseStats,
          hp: 100,
          atk: 15,
          def: 8,
        },
      },
      10
    )

    expect(result.character.level).toBe(2)
    expect(result.character.xp).toBe(5)
    expect(result.character.baseStats.hp).toBe(102)
    expect(result.character.baseStats.atk).toBe(16)
    expect(result.character.baseStats.def).toBe(9)
  })

  it('grants idle disciples experience during cultivation ticks', () => {
    const characterId = useSectStore.getState().sect.characters[0].id

    useSectStore.setState((state) => ({
      sect: {
        ...state.sect,
        resources: {
          ...state.sect.resources,
          spiritEnergy: 1000,
          spiritStone: 0,
        },
        characters: state.sect.characters.map((character) =>
          character.id === characterId
            ? {
                ...character,
                quality: 'common',
                level: 1,
                xp: 95,
                learnedTechniques: [],
                cultivationStats: {
                  ...character.cultivationStats,
                  spiritualRoot: 30,
                  comprehension: 30,
                },
                growthMultipliers: {
                  hp: 1,
                  atk: 1,
                  def: 1,
                  spd: 1,
                  crit: 1,
                  critDmg: 1,
                },
              }
            : character
        ),
      },
    }))

    vi.spyOn(Math, 'random').mockReturnValue(0.99)

    const before = useSectStore.getState().sect.characters[0]
    useSectStore.getState().tickAll(5)
    const updated = useSectStore.getState().sect.characters[0]

    expect(updated.level).toBe(2)
    expect(updated.xp).toBeGreaterThan(0)
    expect(updated.baseStats.hp).toBe(before.baseStats.hp + 2)
    expect(updated.baseStats.atk).toBe(before.baseStats.atk + 1)
    expect(updated.baseStats.def).toBe(before.baseStats.def + 1)
    expect(useEventLogStore.getState().events.some((event) => event.message.includes('升至 Lv.2'))).toBe(true)
  })
})
