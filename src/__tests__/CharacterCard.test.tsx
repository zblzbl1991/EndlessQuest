import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import CharacterCard from '../components/common/CharacterCard'
import { useSectStore } from '../stores/sectStore'

describe('CharacterCard', () => {
  beforeEach(() => {
    useSectStore.getState().reset()
    useSectStore.getState().addResource('spiritEnergy', 100)
  })

  it('surfaces cultivation direction without the old disciple judgment block', () => {
    const base = useSectStore.getState().sect.characters[0]
    const character = {
      ...base,
      cultivationPath: 'alchemy' as const,
      specialties: [{ type: 'alchemy' as const, level: 3 }],
    }

    render(<CharacterCard character={character} />)

    expect(screen.getAllByText('丹修').length).toBeGreaterThan(0)
    expect(screen.getByText('擅长 炼丹')).toBeInTheDocument()
    expect(screen.queryByText('弟子判断')).not.toBeInTheDocument()
  })
})
