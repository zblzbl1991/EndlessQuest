import type { StateCreator } from 'zustand'
import type { SectStore } from './types'
import { createShopState, generateDailyItems } from '../../systems/trade/TradeSystem'

export const createShopSlice: StateCreator<SectStore, [], [], Partial<SectStore>> = (set, get) => ({
  initShop: () => {
    const { sect } = get()
    const marketLevel = sect.buildings.find((b) => b.type === 'market')?.level ?? 0
    const shop = createShopState(marketLevel)
    set({ shopState: shop })
  },

  buyFromShop: (shopItemIndex: number, isDaily: boolean) => {
    const { sect } = get()
    const shop = get().shopState
    if (!shop) return { success: false, reason: '商店未初始化' }
    const items = isDaily ? shop.dailyItems : shop.fixedItems
    const shopItem = items[shopItemIndex]
    if (!shopItem) return { success: false, reason: '商品不存在' }
    if (shopItem.stock === 0) return { success: false, reason: '已售罄' }
    if (sect.resources.spiritStone < shopItem.price) return { success: false, reason: '灵石不足' }
    // Deduct and add to vault
    set((s) => ({
      sect: {
        ...s.sect,
        resources: { ...s.sect.resources, spiritStone: s.sect.resources.spiritStone - shopItem.price },
      },
    }))
    get().addToVault(shopItem.item)
    // Mark as sold
    if (isDaily) {
      const newDaily = [...shop.dailyItems]
      newDaily[shopItemIndex] = { ...shopItem, stock: shopItem.stock === -1 ? -1 : shopItem.stock - 1 }
      set({ shopState: { ...shop, dailyItems: newDaily } })
    }
    return { success: true, reason: '' }
  },

  refreshDailyShop: () => {
    const { sect } = get()
    const marketLevel = sect.buildings.find((b) => b.type === 'market')?.level ?? 0
    const newDailyItems = generateDailyItems(marketLevel)
    const shop = get().shopState
    if (shop) {
      set({ shopState: { ...shop, dailyItems: newDailyItems, lastRefreshTime: Date.now() } })
    }
  },
})
