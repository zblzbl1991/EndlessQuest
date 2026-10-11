export type ItemQuality = 'common' | 'spirit' | 'immortal' | 'divine' | 'chaos'
export type EquipSlot =
  | 'head'
  | 'armor'
  | 'bracer'
  | 'belt'
  | 'boots'
  | 'weapon'
  | 'accessory1'
  | 'accessory2'
  | 'talisman'

export interface ItemStats {
  hp: number
  atk: number
  def: number
  spd: number
  crit: number
  critDmg: number
}

export interface Item {
  id: string
  name: string
  quality: ItemQuality
  type: 'equipment' | 'consumable' | 'material' | 'techniqueScroll'
  description: string
  sellPrice: number
}

export interface EquipmentAffixInstance {
  id: string
  tier: number
}

export interface Equipment extends Item {
  type: 'equipment'
  slot: EquipSlot
  stats: ItemStats
  enhanceLevel: number
  refinementStats: Partial<ItemStats>[]
  setId: string | null
  /** V2.2 工单 03：装备阶位 1-9（缺省按品质折算）。 */
  tier?: number
  /** V2.2 工单 03：机制词条实例（数值查 equipmentAffixes 表）。 */
  affixes?: EquipmentAffixInstance[]
  /** V2.2 工单 03：器灵经验（击杀积累）。 */
  spiritExp?: number
}

export interface Consumable extends Item {
  type: 'consumable'
  effect: { type: string; value: number }
  recipeId?: string
}

export interface Material extends Item {
  type: 'material'
  category: 'herb' | 'ore' | 'other'
}

export interface TechniqueScroll extends Item {
  type: 'techniqueScroll'
  techniqueId: string
}

export type AnyItem = Equipment | Consumable | Material | TechniqueScroll

/** A stackable wrapper for items. Consumables with the same recipeId stack; others always have quantity 1. */
export interface ItemStack {
  item: AnyItem
  quantity: number
}

export interface InventoryState {
  items: AnyItem[]
  maxSlots: number
}
