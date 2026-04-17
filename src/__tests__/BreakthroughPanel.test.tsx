import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import BreakthroughPanel from '../components/cultivation/BreakthroughPanel'
import { useSectStore } from '../stores/sectStore'

describe('BreakthroughPanel', () => {
  beforeEach(() => {
    useSectStore.getState().reset()
    const character = useSectStore.getState().sect.characters[0]
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        resources: { ...s.sect.resources, spiritStone: 1000, spiritEnergy: 100 },
        characters: s.sect.characters.map((item) =>
          item.id === character.id ? { ...item, cultivation: 100, realmStage: 0 } : item
        ),
      },
    }))
  })

  it('shows breakthrough hint with failure risk for minor breakthroughs', () => {
    const character = useSectStore.getState().sect.characters[0]
    render(<BreakthroughPanel characterId={character.id} />)

    expect(screen.getByText(/失败则修为回退或受伤/)).toBeInTheDocument()
  })
})
