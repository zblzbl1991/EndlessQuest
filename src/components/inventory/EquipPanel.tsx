import { usePlayerStore } from '../../stores/playerStore'
import type { Equipment } from '../../types/item'
import { EQUIP_SLOTS, EQUIP_SLOT_NAMES } from '../../data/items'
import styles from './EquipPanel.module.css'

interface EquipPanelProps {
  items: Equipment[]
  onItemClick: (item: Equipment) => void
  onSlotClick: (slotIndex: number) => void
}

export default function EquipPanel({ items, onItemClick, onSlotClick }: EquipPanelProps) {
  const equippedGear = usePlayerStore((s) => s.player.equippedGear)
  const unequipItem = usePlayerStore((s) => s.unequipItem)

  const getItemById = (id: string) => items.find(i => i.id === id)

  return (
    <div className={styles.panel}>
      <div className={styles.title}>已装备</div>
      <div className={styles.slots}>
        {equippedGear.map((gearId, idx) => {
          const item = gearId ? getItemById(gearId) : null
          const slotKey = EQUIP_SLOTS[idx] ?? ''
          return (
            <div
              key={idx}
              className={styles.slot}
              onClick={() => item ? onItemClick(item) : onSlotClick(idx)}
            >
              <span className={styles.slotName}>{EQUIP_SLOT_NAMES[slotKey]}</span>
              {item ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span className={styles.slotItem}>{item.name}{item.enhanceLevel > 0 ? ` +${item.enhanceLevel}` : ''}</span>
                  <button className={styles.unequipBtn} onClick={(e) => { e.stopPropagation(); unequipItem(idx) }}>x</button>
                </div>
              ) : (
                <span className={styles.slotEmpty}>空</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
