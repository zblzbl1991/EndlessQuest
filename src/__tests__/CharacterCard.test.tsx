import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import CharacterCard from '../components/common/CharacterCard'
import { useSectStore } from '../stores/sectStore'

describe('CharacterCard', () => {
  beforeEach(() => {
    useSectStore.getState().reset()
    useSectStore.getState().addResource('spiritEnergy', 100)
  })

  it('surfaces cultivation direction and disciple judgment on the card face', () => {
    const base = useSectStore.getState().sect.characters[0]
    const character = {
      ...base,
      cultivationPath: 'alchemy' as const,
      specialties: [{ type: 'alchemy' as const, level: 3 }],
      fateTags: ['stableDaoHeart' as const],
    }

    render(<CharacterCard character={character} />)

    expect(screen.getByText('修行去向')).toBeInTheDocument()
    expect(screen.getByText('弟子判断')).toBeInTheDocument()
  })
})
