import type { SpecialtyType } from '../types/character'

/** Maps specialty type to its corresponding building type (null if passive) */
export const SPECIALTY_BUILDING_MAP: Record<SpecialtyType, string | null> = {
  alchemy: 'alchemyFurnace',
  forging: 'forge',
  mining: 'spiritMine',
  herbalism: 'spiritField',
  comprehension: 'scriptureHall',
  combat: null,
  fortune: null,
  leadership: null,
}

/** Bonus values per specialty type and level */
export const SPECIALTY_BONUS_TABLE: Record<SpecialtyType, Record<number, number>> = {
  alchemy: { 1: 0.15, 2: 0.30, 3: 0.50 },
  forging: { 1: 0.10, 2: 0.20, 3: 0.35 },
  mining: { 1: 0.10, 2: 0.20, 3: 0.35 },
  herbalism: { 1: 0.10, 2: 0.20, 3: 0.35 },
  comprehension: { 1: 0.15, 2: 0.30, 3: 0.50 },
  combat: { 1: 0.05, 2: 0.10, 3: 0.20 },
  fortune: { 1: 0.10, 2: 0.20, 3: 0.35 },
  leadership: { 1: 1, 2: 1, 3: 1.05 },
}

/** All possible specialty types */
export const ALL_SPECIALTY_TYPES: SpecialtyType[] = [
  'alchemy', 'forging', 'mining', 'herbalism',
  'comprehension', 'combat', 'fortune', 'leadership',
]
