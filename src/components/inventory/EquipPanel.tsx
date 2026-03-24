import { useSectStore } from '../../stores/sectStore'
import type { Equipment } from '../../types/item'
import { EQUIP_SLOTS, EQUIP_SLOT_NAMES } from '../../data/items'
import styles from './EquipPanel.module.css'

interface EquipPanelProps {
  characterId: string
  onItemClick: (item: Equipment) => void
  onSlotClick: (slotIndex: number) => void
}

export default function EquipPanel({ characterId, onItemClick, onSlotClick }: EquipPanelProps) {
  const character = useSectStore((s) => s.sect.characters.find((c) => c.id === characterId))
  const unequipItem = useSectStore((s) => s.unequipItem)
  const sect = useSectStore((s) => s.sect)

  if (!character) return null

  const findEquipmentById = (id: string): Equipment | undefined => {
    for (const item of sect.vault) {
      if (item.id === id && item.type === 'equipment') return item
    }
    for (const char of sect.characters) {
      for (const item of char.backpack) {
        if (item.id === id && item.type === 'equipment') return item
      }
    }
    return undefined
  }

  return (
    <div className={styles.panel}>
      <div className={styles.title}>已装备</div>
      <div className={styles.slots}>
        {character.equippedGear.map((gearId, idx) => {
          const item = gearId ? findEquipmentById(gearId) : null
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
                  <button className={styles.unequipBtn} onClick={(e) => { e.stopPropagation(); unequipItem(characterId, idx) }}>x</button>
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
