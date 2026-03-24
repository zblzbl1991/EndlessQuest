import { create } from 'zustand'
import type { ShopItem, ShopState } from '../systems/trade/TradeSystem'
import { createShopState, shouldRefreshDaily, generateDailyItems } from '../systems/trade/TradeSystem'
import { useInventoryStore } from './inventoryStore'
import { useSectStore } from './sectStore'

interface TradeState {
  shop: ShopState
  buyItem: (shopItem: ShopItem) => boolean
  refreshDaily: () => void
  checkAndRefreshDaily: () => void
  reset: () => void
}

export const useTradeStore = create<TradeState>((set, get) => ({
  shop: createShopState(0),

  buyItem: (shopItem) => {
    const inventory = useInventoryStore.getState()

    const currency = shopItem.currency === 'fairyJade'
      ? inventory.resources.fairyJade
      : inventory.resources.spiritStone

    if (currency < shopItem.price) return false
    if (shopItem.stock === 0) return false

    // Deduct currency
    if (shopItem.currency === 'fairyJade') {
      inventory.spendResource('fairyJade', shopItem.price)
    } else {
      inventory.spendResource('spiritStone', shopItem.price)
    }

    // Add item to inventory
    inventory.addItem(shopItem.item)

    // Reduce stock (only for daily items with finite stock)
    if (shopItem.stock > 0) {
      set((s) => ({
        shop: {
          ...s.shop,
          dailyItems: s.shop.dailyItems.map(item =>
            item.id === shopItem.id ? { ...item, stock: item.stock - 1 } : item
          ),
        },
      }))
    }

    return true
  },

  refreshDaily: () => {
    const marketLevel = useSectStore.getState().buildings.find(b => b.type === 'market')?.level ?? 0
    set({
      shop: {
        ...get().shop,
        dailyItems: generateDailyItems(marketLevel),
        lastRefreshTime: Date.now(),
      },
    })
  },

  checkAndRefreshDaily: () => {
    const { shop } = get()
    if (shouldRefreshDaily(shop.lastRefreshTime)) {
      get().refreshDaily()
    }
  },

  reset: () => set({ shop: createShopState(0) }),
}))
