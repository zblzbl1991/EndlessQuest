import { buildingIcons } from './buildings'
import { characterIcons } from './characters'
import { itemIcons } from './items'
import { techniqueIcons } from './techniques'
import { worldIcons } from './world'
import { uiIcons } from './ui'
import type { PixelIconDef } from './types'

/**
 * Master registry of all pixel icons.
 * Usage: import { pixelIcons } from '../../data/icons';
 *        pixelIcons['mainHall'] → PixelIconDef
 */
export const pixelIcons: Record<string, PixelIconDef> = {
  ...buildingIcons,
  ...characterIcons,
  ...itemIcons,
  ...techniqueIcons,
  ...worldIcons,
  ...uiIcons,
}

export { PALETTE } from './types'
export type { PixelIconDef } from './types'
