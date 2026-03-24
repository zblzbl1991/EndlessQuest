import { generateDailyItems, createShopState, FIXED_SHOP_ITEMS, shouldRefreshDaily } from '../systems/trade/TradeSystem'

describe('TradeSystem', () => {
  it('should have fixed shop items', () => {
    expect(FIXED_SHOP_ITEMS.length).toBeGreaterThan(0)
    expect(FIXED_SHOP_ITEMS[0].stock).toBe(-1) // unlimited
  })

  it('should generate 4 daily items', () => {
    const items = generateDailyItems(0)
    expect(items).toHaveLength(4)
    expect(items[0].stock).toBe(1)
    expect(items[0].isDaily).toBe(true)
  })

  it('daily items quality should scale with market level', () => {
    const lv0 = generateDailyItems(0)
    const lv5 = generateDailyItems(5)
    // lv0 only common, lv5 can have spirit or immortal
    const lv0Qualities = lv0.map(i => i.item.quality)
    const lv5Qualities = lv5.map(i => i.item.quality)
    expect(lv0Qualities.every(q => q === 'common')).toBe(true)
    expect(lv5Qualities.some(q => q === 'spirit' || q === 'immortal')).toBe(true)
  })

  it('should create shop state', () => {
    const shop = createShopState(1)
    expect(shop.fixedItems.length).toBeGreaterThan(0)
    expect(shop.dailyItems.length).toBe(4)
  })

  it('should detect daily refresh needed', () => {
    const yesterday = Date.now() - 86400000
    expect(shouldRefreshDaily(yesterday)).toBe(true)
    expect(shouldRefreshDaily(Date.now())).toBe(false)
  })
})
