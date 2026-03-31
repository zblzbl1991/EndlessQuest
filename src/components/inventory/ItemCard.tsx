import type { AnyItem, Equipment } from '../../types/item'
import { QUALITY_NAMES, EQUIP_SLOT_NAMES } from '../../data/items'
import { getEffectiveStats } from '../../systems/equipment/EquipmentEngine'
import { PixelIcon } from '../common/PixelIcon'
import styles from './ItemCard.module.css'

interface ItemCardProps {
  item: AnyItem | null
  selected?: boolean
  onClick?: () => void
}

const qualityClass: Record<string, string> = {
  common: styles.qualityCommon,
  spirit: styles.qualitySpirit,
  immortal: styles.qualityImmortal,
  divine: styles.qualityDivine,
  chaos: styles.qualityChaos,
}

function getItemIconName(item: AnyItem): string {
  if (item.type === 'equipment') {
    switch (item.slot) {
      case 'head':
        return 'equipHead'
      case 'armor':
        return 'equipArmor'
      case 'bracer':
        return 'equipBracer'
      case 'belt':
        return 'equipBelt'
      case 'boots':
        return 'equipBoots'
      case 'weapon':
        return 'equipWeapon'
      case 'talisman':
        return 'equipTalisman'
      case 'accessory1':
      case 'accessory2':
        return 'equipAccessory'
      default:
        return 'typeEquipment'
    }
  }

  if (item.type === 'techniqueScroll') return 'techniqueScroll'
  if (item.type === 'consumable') return item.name.includes('丹') ? 'elixir' : 'typeConsumable'
  if (item.category === 'herb') return 'herb'
  if (item.category === 'ore') return 'ore'
  return 'typeMaterial'
}

export default function ItemCard({ item, selected, onClick }: ItemCardProps) {
  if (!item) return <div className={styles.empty} />

  const isEquipment = item.type === 'equipment'

  return (
    <div className={`${styles.card} ${selected ? styles.selected : ''}`} onClick={onClick}>
      <span className={`${styles.qualityTag} ${qualityClass[item.quality] ?? ''}`}>{QUALITY_NAMES[item.quality]}</span>
      <span className={styles.name}>
        <PixelIcon name={getItemIconName(item)} size={16} className={styles.itemIcon} aria-label={item.name} />
        {item.name}
      </span>
      {isEquipment && (
        <>
          <span className={styles.slot}>{EQUIP_SLOT_NAMES[(item as Equipment).slot] ?? (item as Equipment).slot}</span>
          {(item as Equipment).enhanceLevel > 0 && (
            <span className={styles.enhance}>+{(item as Equipment).enhanceLevel}</span>
          )}
          <span className={styles.stats}>{formatStats(getEffectiveStats(item as Equipment))}</span>
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
