import type { AnyItem, Equipment } from '../../types/item'
import { QUALITY_NAMES, EQUIP_SLOT_NAMES } from '../../data/items'
import { getEffectiveStats } from '../../systems/equipment/EquipmentEngine'
import styles from './ItemCard.module.css'

interface ItemCardProps {
  item: AnyItem | null
  selected?: boolean
  onClick?: () => void
}

const qualityClass: Record<string, string> = {
  common: styles.qualityCommon, spirit: styles.qualitySpirit,
  immortal: styles.qualityImmortal, divine: styles.qualityDivine, chaos: styles.qualityChaos,
}

export default function ItemCard({ item, selected, onClick }: ItemCardProps) {
  if (!item) return <div className={styles.empty} />

  const isEquipment = item.type === 'equipment'

  return (
    <div className={`${styles.card} ${selected ? styles.selected : ''}`} onClick={onClick}>
      <span className={`${styles.qualityTag} ${qualityClass[item.quality] ?? ''}`}>
        {QUALITY_NAMES[item.quality]}
      </span>
      <span className={styles.name}>{item.name}</span>
      {isEquipment && (
        <>
          <span className={styles.slot}>{EQUIP_SLOT_NAMES[(item as Equipment).slot] ?? (item as Equipment).slot}</span>
          {(item as Equipment).enhanceLevel > 0 && (
            <span className={styles.enhance}>+{(item as Equipment).enhanceLevel}</span>
          )}
          <span className={styles.stats}>
            {formatStats(getEffectiveStats(item as Equipment))}
          </span>
        </>
      )}
    </div>
  )
}

function formatStats(stats: { hp: number; atk: number; def: number; spd: number }): string {
  const parts: string[] = []
  if (stats.hp > 0) parts.push(`HP${stats.hp}`)
  if (stats.atk > 0) parts.push(`ATK${stats.atk}`)
  if (stats.def > 0) parts.push(`DEF${stats.def}`)
  if (stats.spd > 0) parts.push(`SPD${stats.spd}`)
  return parts.join(' ')
}
