// src/systems/item/ItemGenerator.ts
import type { Equipment, ItemQuality, EquipSlot, ItemStats } from '../../types/item'
import { QUALITY_NAMES } from '../../data/items'

export interface SlotBaseStats {
  hp: number; atk: number; def: number; spd: number; crit: number; critDmg: number
}

const QUALITY_MULT: Record<ItemQuality, number> = {
  common: 1, spirit: 1.8, immortal: 3, divine: 5, chaos: 8,
}

const SLOT_BASE: Record<EquipSlot, SlotBaseStats> = {
  head:      { hp: 15, atk: 0, def: 5, spd: 0, crit: 0, critDmg: 0 },
  armor:     { hp: 20, atk: 0, def: 8, spd: 0, crit: 0, critDmg: 0 },
  bracer:    { hp: 5, atk: 3, def: 3, spd: 0, crit: 0, critDmg: 0 },
  belt:      { hp: 10, atk: 0, def: 4, spd: 2, crit: 0, critDmg: 0 },
  boots:     { hp: 5, atk: 0, def: 2, spd: 5, crit: 0, critDmg: 0 },
  weapon:    { hp: 0, atk: 8, def: 0, spd: 0, crit: 0, critDmg: 0 },
  accessory1:{ hp: 8, atk: 2, def: 2, spd: 2, crit: 0, critDmg: 0 },
  accessory2:{ hp: 8, atk: 2, def: 2, spd: 2, crit: 0, critDmg: 0 },
  talisman:  { hp: 10, atk: 5, def: 0, spd: 0, crit: 0.05, critDmg: 0 },
}

// Add some randomness: +/-20% variance
function vary(value: number): number {
  const variance = value * 0.2
  return Math.max(0, Math.floor(value + (Math.random() * 2 - 1) * variance))
}

// Chinese item name generator
const SLOT_PREFIX: Record<string, string> = {
  head: '冠', armor: '袍', bracer: '腕', belt: '带', boots: '靴',
  weapon: '剑', accessory1: '佩', accessory2: '佩', talisman: '符',
}

const QUALITY_PREFIX: Record<ItemQuality, string> = {
  common: '', spirit: '灵', immortal: '仙', divine: '神', chaos: '混沌',
}

const WEAPON_NAMES = ['青锋', '流云', '碎星', '寒霜', '赤焰', '苍穹']
const ARMOR_NAMES = ['清风', '玄铁', '冰心', '天蚕', '紫霄']
const ACCESSORY_NAMES = ['灵犀', '碧玉', '金丝', '玄珠']
const OTHER_NAMES = ['素练', '银纹', '赤金', '紫云']

let _idCounter = 0

function generateId(): string {
  return `item_${Date.now()}_${++_idCounter}`
}

export function generateEquipment(
  slot: EquipSlot,
  quality: ItemQuality,
  _seed?: number,
): Equipment {
  const mult = QUALITY_MULT[quality]
  const base = SLOT_BASE[slot]

  const stats: ItemStats = {
    hp: vary(base.hp * mult),
    atk: vary(base.atk * mult),
    def: vary(base.def * mult),
    spd: vary(base.spd * mult),
    crit: Math.round(base.crit * mult * 1000) / 1000, // keep precision
    critDmg: Math.round(base.critDmg * mult * 100) / 100,
  }

  // Pick a random name
  let namePool: string[]
  if (slot === 'weapon') namePool = WEAPON_NAMES
  else if (slot === 'armor') namePool = ARMOR_NAMES
  else if (slot.startsWith('accessory')) namePool = ACCESSORY_NAMES
  else namePool = OTHER_NAMES

  const randomName = namePool[Math.floor(Math.random() * namePool.length)]
  const prefix = QUALITY_PREFIX[quality]
  const suffix = SLOT_PREFIX[slot]
  const name = quality === 'common' ? `${randomName}${suffix}` : `${prefix}${randomName}${suffix}`

  return {
    id: generateId(),
    name,
    quality,
    type: 'equipment',
    slot,
    stats,
    enhanceLevel: 0,
    refinementStats: [],
    setId: null,
    description: `${QUALITY_NAMES[quality]}品质${SLOT_PREFIX[slot]}，${Object.entries(stats).filter(([, v]) => v > 0).map(([k, v]) => `${k.toUpperCase()}+${v}`).join(' ')}`,
    sellPrice: Math.floor(mult * 10),
  }
}

export function generateRandomEquipment(maxQuality: ItemQuality = 'common'): Equipment {
  const slots: EquipSlot[] = ['head', 'armor', 'bracer', 'belt', 'boots', 'weapon', 'accessory1', 'accessory2', 'talisman']
  const qualities: ItemQuality[] = ['common', 'spirit', 'immortal', 'divine', 'chaos']
  const maxIdx = qualities.indexOf(maxQuality)
  const quality = qualities[Math.floor(Math.random() * (maxIdx + 1))]
  const slot = slots[Math.floor(Math.random() * slots.length)]
  return generateEquipment(slot, quality)
}

export function getEnhanceCost(item: Equipment, targetLevel: number): { spiritStone: number; ore: number } {
  const mult = QUALITY_MULT[item.quality]
  return {
    spiritStone: (targetLevel + 1) * mult * 50,
    ore: (targetLevel + 1) * mult * 5,
  }
}
