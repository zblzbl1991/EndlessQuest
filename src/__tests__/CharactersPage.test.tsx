import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import CharactersPage from '../pages/CharactersPage'
import { useSectStore } from '../stores/sectStore'
import { useGameStore } from '../stores/gameStore'
import { IdleEngine } from '../systems/idle/IdleEngine'

function resetState() {
  useSectStore.getState().reset()
  useGameStore.getState().reset()
}

function getCultivationHeaderText(): string {
  return (
    screen.getByText((content, element) => {
      return Boolean(element?.textContent?.includes('(+') && content.includes('/ 100'))
    }).textContent ?? ''
  )
}

describe('CharactersPage', () => {
  beforeEach(() => {
    resetState()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('updates cultivation text in detail view after store tick', () => {
    const store = useSectStore.getState()
    store.addResource('spiritEnergy', 100)
    const character = store.sect.characters[0]

    render(<CharactersPage />)

    fireEvent.click(screen.getByText(character.name))

    expect(getCultivationHeaderText()).toMatch(/^0(\.0)? \/ 100/)

    act(() => {
      useSectStore.getState().tickAll(10)
    })

    expect(getCultivationHeaderText()).toMatch(/^[1-9]\d*(\.\d)? \/ 100/)
  })

  it('shows partial cultivation growth instead of rounding it down to zero', () => {
    const store = useSectStore.getState()
    store.addResource('spiritEnergy', 100)
    const character = store.sect.characters[0]

    render(<CharactersPage />)

    fireEvent.click(screen.getByText(character.name))
    expect(getCultivationHeaderText()).toMatch(/^0(\.0)? \/ 100/)

    act(() => {
      useSectStore.getState().tickAll(0.2)
    })

    expect(getCultivationHeaderText()).toMatch(/^(0\.\d|1\.\d) \/ 100/)
  })

  it('shows the new list-page overview anchors', () => {
    render(<CharactersPage />)

    expect(screen.getByTestId('characters-hero')).toBeInTheDocument()
    expect(screen.getByText('弟子')).toBeInTheDocument()
    expect(screen.getByText('全部')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '网格' })).toBeInTheDocument()
  })

  it('shows cultivation rate with spirit supply from spirit field', () => {
    const character = useSectStore.getState().sect.characters[0]

    render(<CharactersPage />)

    fireEvent.click(screen.getByText(character.name))

    expect(getCultivationHeaderText()).toMatch(/\(\+\d+\.\d\/s\)/)
  })

  it('updates cultivation text over time when the idle engine is running', () => {
    vi.useFakeTimers()

    useSectStore.getState().addResource('spiritEnergy', 100)
    const character = useSectStore.getState().sect.characters[0]
    const engine = new IdleEngine((delta) => useSectStore.getState().tickAll(delta))

    render(<CharactersPage />)

    fireEvent.click(screen.getByText(character.name))
    expect(getCultivationHeaderText()).toMatch(/^0(\.0)? \/ 100/)

    act(() => {
      engine.start()
      vi.advanceTimersByTime(10000)
      engine.stop()
    })

    expect(getCultivationHeaderText()).toMatch(/^[1-9]\d*(\.\d)? \/ 100/)
  })

  it('keeps the detail view focused on build and state without rendering the old disciple judgment cards', () => {
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((character, index) =>
          index === 0
            ? {
                ...character,
                specialties: [
                  { type: 'alchemy', level: 3 },
                  { type: 'comprehension', level: 2 },
                ],
                cultivationPath: 'alchemy',
              }
            : character
        ),
      },
    }))

    const character = useSectStore.getState().sect.characters[0]

    render(<CharactersPage />)

    fireEvent.click(screen.getByText(character.name))

    expect(screen.getByTestId('character-identity')).toBeInTheDocument()
    expect(screen.getByText('战斗画像')).toBeInTheDocument()
    expect(screen.getByText('装备')).toBeInTheDocument()
    expect(screen.getByText('背包')).toBeInTheDocument()
    expect(screen.queryByText('留守价值')).not.toBeInTheDocument()
    expect(screen.queryByText('出战价值')).not.toBeInTheDocument()
    expect(screen.queryByText('承险能力')).not.toBeInTheDocument()
    expect(screen.queryByText('推荐去向')).not.toBeInTheDocument()
  })
})
