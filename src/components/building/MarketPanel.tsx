import { useState, useEffect } from 'react'
import { useSectStore } from '../../stores/sectStore'
import { getMarketBuff } from '../../systems/economy/BuildingEffects'
import styles from './MarketPanel.module.css'

const QUALITY_LABELS: Record<string, string> = {
  common: '凡品',
  spirit: '灵品',
  immortal: '仙品',
  divine: '神品',
}

function getQualityClass(quality: string): string {
  if (quality === 'divine') return styles.itemQualityDivine
  if (quality === 'immortal') return styles.itemQualityImmortal
  if (quality === 'spirit') return styles.itemQualitySpirit
  return ''
}

export default function MarketPanel() {
  const sect = useSectStore((s) => s.sect)
  const shopState = useSectStore((s) => s.shopState)
  const initShop = useSectStore((s) => s.initShop)
  const buyFromShop = useSectStore((s) => s.buyFromShop)
  const refreshDailyShop = useSectStore((s) => s.refreshDailyShop)
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null)
  const [refreshCount, setRefreshCount] = useState(0)

  const marketLevel = sect.buildings.find(b => b.type === 'market')?.level ?? 0
  const marketBuff = getMarketBuff(marketLevel)

  // Lazy-init shop on mount
  useEffect(() => {
    if (!shopState) {
      initShop()
    }
  }, [])

  // Auto-refresh daily items on new day
  useEffect(() => {
    if (shopState && refreshCount < marketBuff.dailyRefreshCount) {
      // No auto-refresh needed here; refresh is manual
    }
  }, [shopState])

  const handleBuy = (index: number, isDaily: boolean) => {
    const result = buyFromShop(index, isDaily)
    if (result.success) {
      setMessage({ success: true, text: '购买成功，物品已存入仓库' })
    } else {
      setMessage({ success: false, text: result.reason })
    }
    setTimeout(() => setMessage(null), 2000)
  }

  const handleRefresh = () => {
    if (refreshCount >= marketBuff.dailyRefreshCount) {
      setMessage({ success: false, text: '今日刷新次数已用尽' })
      setTimeout(() => setMessage(null), 2000)
      return
    }
    refreshDailyShop()
    setRefreshCount(prev => prev + 1)
    setMessage({ success: true, text: '商品已刷新' })
    setTimeout(() => setMessage(null), 2000)
  }

  if (!shopState) {
    return (
      <div className={styles.buildingPanel}>
        <div className={styles.empty}>商店加载中...</div>
      </div>
    )
  }

  return (
    <div className={styles.buildingPanel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>坊市 Lv{marketLevel}</span>
        <span className={styles.resourceDisplay}>
          灵石 {sect.resources.spiritStone}
        </span>
      </div>

      {/* Fixed items section */}
      <div className={styles.sectionTitle}>常驻商品</div>
      {shopState.fixedItems.map((shopItem, idx) => (
        <div key={shopItem.id} className={styles.itemCard}>
          <div className={styles.itemHeader}>
            <span className={styles.itemName}>{shopItem.item.name}</span>
            <span className={`${styles.itemQuality} ${getQualityClass(shopItem.item.quality)}`}>
              {QUALITY_LABELS[shopItem.item.quality] || shopItem.item.quality}
            </span>
          </div>
          <div className={styles.itemDesc}>{shopItem.item.description}</div>
          <div className={styles.itemActions}>
            <span className={styles.itemPrice}>{shopItem.price}灵石</span>
            <button
              className={`${styles.buyBtn} ${sect.resources.spiritStone >= shopItem.price ? styles.buyReady : styles.buyDisabled}`}
              onClick={() => handleBuy(idx, false)}
              disabled={sect.resources.spiritStone < shopItem.price}
            >
              购买
            </button>
          </div>
        </div>
      ))}

      {/* Daily items section */}
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>每日商品</span>
        <button
          className={`${styles.refreshBtn} ${refreshCount >= marketBuff.dailyRefreshCount ? styles.refreshDisabled : ''}`}
          onClick={handleRefresh}
          disabled={refreshCount >= marketBuff.dailyRefreshCount}
        >
          刷新 ({marketBuff.dailyRefreshCount - refreshCount}次)
        </button>
      </div>
      {shopState.dailyItems.map((shopItem, idx) => (
        <div key={`${shopItem.id}-${idx}`} className={styles.itemCard}>
          <div className={styles.itemHeader}>
            <span className={styles.itemName}>{shopItem.item.name}</span>
            <span className={`${styles.itemQuality} ${getQualityClass(shopItem.item.quality)}`}>
              {QUALITY_LABELS[shopItem.item.quality] || shopItem.item.quality}
            </span>
          </div>
          {shopItem.item.description && (
            <div className={styles.itemDesc}>{shopItem.item.description}</div>
          )}
          <div className={styles.itemActions}>
            <span className={styles.itemPrice}>{shopItem.price}灵石</span>
            <span className={styles.itemStock}>
              {shopItem.stock === -1 ? '不限' : `剩余 ${shopItem.stock}`}
            </span>
            <button
              className={`${styles.buyBtn} ${
                (sect.resources.spiritStone >= shopItem.price && shopItem.stock !== 0)
                  ? styles.buyReady
                  : styles.buyDisabled
              }`}
              onClick={() => handleBuy(idx, true)}
              disabled={sect.resources.spiritStone < shopItem.price || shopItem.stock === 0}
            >
              {shopItem.stock === 0 ? '已售罄' : '购买'}
            </button>
          </div>
        </div>
      ))}

      {message && (
        <div className={message.success ? 'globalMessageSuccess' : 'globalMessageFail'}>
          {message.text}
        </div>
      )}
    </div>
  )
}
