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
})
