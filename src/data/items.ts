import type { ItemQuality } from '../types/item'

export const QUALITY_ORDER: ItemQuality[] = ['common', 'spirit', 'immortal', 'divine', 'chaos']

export const QUALITY_NAMES: Record<ItemQuality, string> = {
  common: '凡品', spirit: '灵品', immortal: '仙品', divine: '神品', chaos: '混沌',
}

export const QUALITY_COLORS: Record<ItemQuality, string> = {
  common: 'var(--color-quality-common)',
  spirit: 'var(--color-quality-spirit)',
  immortal: 'var(--color-quality-immortal)',
  divine: 'var(--color-quality-divine)',
  chaos: 'var(--color-quality-chaos)',
}

/**
 * Quality colors specifically for technique scroll items.
 * Maps each technique tier to its display color.
 */
export const TECHNIQUE_SCROLL_COLORS: Record<ItemQuality, string> = {
  common: '#8B7355',      // Brown — mortal tier
  spirit: '#4A9EDE',      // Blue — spirit tier
  immortal: '#A855F7',    // Purple — immortal tier
  divine: '#F59E0B',      // Gold — divine tier
  chaos: '#EF4444',       // Red — chaos tier
}

export const ENHANCE_RATES: number[] = [
  1.0, 1.0, 1.0, 1.0, 1.0,
  0.9, 0.86, 0.82, 0.78, 0.74,
  0.6, 0.5, 0.4, 0.3, 0.2,
]

export function getEnhanceRate(level: number): number {
  if (level < 1 || level > 15) return 0
  return ENHANCE_RATES[level - 1]
}

export const EQUIP_SLOTS = [
  'head', 'armor', 'bracer', 'belt', 'boots',
  'weapon', 'accessory1', 'accessory2', 'talisman',
] as const

export const EQUIP_SLOT_NAMES: Record<string, string> = {
  head: '头冠', armor: '道袍', bracer: '护腕', belt: '腰带', boots: '鞋子',
  weapon: '武器', accessory1: '饰品', accessory2: '饰品', talisman: '法宝',
}
