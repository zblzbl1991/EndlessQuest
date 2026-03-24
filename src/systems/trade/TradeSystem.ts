import type { AnyItem, ItemQuality } from '../../types/item'
import { generateEquipment } from '../item/ItemGenerator'

export interface ShopItem {
  id: string
  item: AnyItem
  price: number       // in spiritStone
  currency: 'spiritStone' | 'fairyJade'
  stock: number       // -1 = unlimited
  isDaily: boolean    // refreshes daily
}

export interface ShopState {
  fixedItems: ShopItem[]
  dailyItems: ShopItem[]
  lastRefreshTime: number
}

export const FIXED_SHOP_ITEMS: ShopItem[] = [
  {
    id: 'potion_hp',
    item: {
      id: 'potion_hp',
      name: '回血丹',
      quality: 'common' as ItemQuality,
      type: 'consumable',
      description: '恢复30%生命',
      sellPrice: 10,
      effect: { type: 'hp_percent', value: 30 },
    } as AnyItem,
    price: 50,
    currency: 'spiritStone',
    stock: -1,
    isDaily: false,
  },
  {
    id: 'potion_spirit',
    item: {
      id: 'potion_spirit',
      name: '灵气丹',
      quality: 'common' as ItemQuality,
      type: 'consumable',
      description: '恢复50灵力',
      sellPrice: 10,
      effect: { type: 'spirit', value: 50 },
    } as AnyItem,
    price: 80,
    currency: 'spiritStone',
    stock: -1,
    isDaily: false,
  },
  {
    id: 'material_herb',
    item: {
      id: 'material_herb',
      name: '灵草',
      quality: 'common' as ItemQuality,
      type: 'material',
      description: '炼丹材料',
      sellPrice: 5,
      category: 'herb',
    } as AnyItem,
    price: 20,
    currency: 'spiritStone',
    stock: -1,
    isDaily: false,
  },
  {
    id: 'material_ore',
    item: {
      id: 'material_ore',
      name: '矿材',
      quality: 'common' as ItemQuality,
      type: 'material',
      description: '炼器材料',
      sellPrice: 5,
      category: 'ore',
    } as AnyItem,
    price: 30,
    currency: 'spiritStone',
    stock: -1,
    isDaily: false,
  },
]

const DAILY_QUALITY_BY_MARKET_LEVEL: Record<number, ItemQuality[]> = {
  0: ['common'],
  1: ['common', 'spirit'],
  2: ['common', 'spirit'],
  3: ['spirit'],
  4: ['spirit', 'immortal'],
  5: ['spirit', 'immortal'],
  6: ['immortal'],
  7: ['immortal', 'divine'],
  8: ['immortal', 'divine'],
}

const EQUIP_SLOTS = [
  'head', 'armor', 'bracer', 'belt', 'boots',
  'weapon', 'accessory1', 'accessory2', 'talisman',
] as const

export function generateDailyItems(marketLevel: number): ShopItem[] {
  const possibleQualities = DAILY_QUALITY_BY_MARKET_LEVEL[marketLevel] ?? (['common'] as ItemQuality[])
  const items: ShopItem[] = []

  for (let i = 0; i < 4; i++) {
    const quality = possibleQualities[Math.floor(Math.random() * possibleQualities.length)]
    const slot = EQUIP_SLOTS[Math.floor(Math.random() * EQUIP_SLOTS.length)]
    const equipment = generateEquipment(slot, quality)

    // Price = 2x sell price
    items.push({
      id: equipment.id,
      item: equipment,
      price: equipment.sellPrice * 2,
      currency: 'spiritStone',
      stock: 1,
      isDaily: true,
    })
  }

  return items
}

export function createShopState(marketLevel: number): ShopState {
  return {
    fixedItems: [...FIXED_SHOP_ITEMS],
    dailyItems: generateDailyItems(marketLevel),
    lastRefreshTime: Date.now(),
  }
}

export function shouldRefreshDaily(lastRefreshTime: number): boolean {
  const now = new Date()
  const last = new Date(lastRefreshTime)
  return now.getDate() !== last.getDate() || now.getMonth() !== last.getMonth()
}
