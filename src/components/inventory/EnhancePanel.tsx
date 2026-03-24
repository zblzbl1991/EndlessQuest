import { useState } from 'react'
import type { Equipment } from '../../types/item'
import { useSectStore } from '../../stores/sectStore'
import { getEnhanceCost } from '../../systems/item/ItemGenerator'
import { getEnhanceRate } from '../../data/items'
import styles from './EnhancePanel.module.css'

interface EnhancePanelProps {
  characterId: string
  backpackIndex: number
  item: Equipment
  onEnhanced: () => void
}

export default function EnhancePanel({ characterId, backpackIndex, item, onEnhanced }: EnhancePanelProps) {
  const resources = useSectStore((s) => s.sect.resources)
  const enhanceItem = useSectStore((s) => s.enhanceItem)
  const [result, setResult] = useState<{ success: boolean; msg: string } | null>(null)

  if (item.enhanceLevel >= 15) {
    return (
      <div className={styles.panel}>
        <div className={styles.title}>强化</div>
        <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>已达到最高强化等级 (+15)</p>
      </div>
    )
  }

  const nextLevel = item.enhanceLevel + 1
  const cost = getEnhanceCost(item, nextLevel)
  const rate = Math.round(getEnhanceRate(nextLevel) * 100)
  const canAfford = resources.spiritStone >= cost.spiritStone && resources.ore >= cost.ore

  const handleEnhance = () => {
    const res = enhanceItem(characterId, backpackIndex)
    if (res.newLevel > item.enhanceLevel) {
      setResult({ success: true, msg: `强化成功！+${res.newLevel}` })
      onEnhanced()
    } else if (res.cost.spiritStone > 0) {
      setResult({ success: false, msg: '强化失败' })
    }
    setTimeout(() => setResult(null), 2000)
  }

  return (
    <div className={styles.panel}>
      <div className={styles.title}>强化 ({item.name})</div>
      <div className={styles.itemInfo}>
        当前 +{item.enhanceLevel} → 目标 +{nextLevel} | 成功率 {rate}%
      </div>
      <div className={styles.cost}>
        <span>灵石</span>
        <span className={canAfford ? styles.costValue : styles.costInsufficient}>
          {cost.spiritStone}
        </span>
      </div>
      <div className={styles.cost}>
        <span>矿材</span>
        <span className={canAfford ? styles.costValue : styles.costInsufficient}>
          {cost.ore}
        </span>
      </div>
      <button
        className={`${styles.button} ${canAfford ? styles.buttonReady : styles.buttonDisabled}`}
        onClick={handleEnhance}
        disabled={!canAfford}
      >
        强化 +{nextLevel}
      </button>
      {result && (
        <div className={`${styles.result} ${result.success ? styles.resultSuccess : styles.resultFail}`}>
          {result.msg}
        </div>
      )}
    </div>
  )
}
