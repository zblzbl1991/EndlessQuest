import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PixelIcon } from '../components/common/PixelIcon'
import { pixelIcons } from '../data/icons'

const REQUIRED_ICON_NAMES = [
  'disciple',
  'cultivation',
  'dispatch',
  'adventure',
  'recovery',
  'building',
  'mainHall',
  'spiritField',
  'spiritMine',
  'alchemyFurnace',
  'scriptureHall',
  'marketTrade',
  'forgeWorkshop',
  'technique',
  'swordPath',
  'bodyPath',
  'spellPath',
  'alchemyPath',
  'beastPath',
  'techniqueScroll',
  'elixir',
  'swordManual',
  'thunderArt',
  'beastTaming',
] as const

describe('pixel icon registry', () => {
  it('registers the expanded batches of disciple, building, item, and technique icons', () => {
    for (const name of REQUIRED_ICON_NAMES) {
      expect(pixelIcons[name]).toBeDefined()
      expect(pixelIcons[name].grid).toHaveLength(12)
      for (const row of pixelIcons[name].grid) {
        expect(row).toHaveLength(12)
      }
    }
  })

  it('renders the new icons through PixelIcon', () => {
    render(
      <div>
        <PixelIcon name="disciple" aria-label="disciple-icon" />
        <PixelIcon name="building" aria-label="building-icon" />
        <PixelIcon name="technique" aria-label="technique-icon" />
        <PixelIcon name="thunderArt" aria-label="thunder-art-icon" />
      </div>
    )

    expect(screen.getByLabelText('disciple-icon')).toBeInTheDocument()
    expect(screen.getByLabelText('building-icon')).toBeInTheDocument()
    expect(screen.getByLabelText('technique-icon')).toBeInTheDocument()
    expect(screen.getByLabelText('thunder-art-icon')).toBeInTheDocument()
  })
})
