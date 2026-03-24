import { useState, useMemo } from 'react'
import { useInventoryStore } from '../stores/inventoryStore'
import { usePlayerStore } from '../stores/playerStore'
import { EQUIP_SLOT_NAMES, QUALITY_NAMES } from '../data/items'
import { getSlotIndex } from '../systems/equipment/EquipmentEngine'
import { generateEquipment } from '../systems/item/ItemGenerator'
import type { Equipment } from '../types/item'
import ItemCard from '../components/inventory/ItemCard'
import EquipPanel from '../components/inventory/EquipPanel'
import EnhancePanel from '../components/inventory/EnhancePanel'
import styles from './Inventory.module.css'

export default function Inventory() {
  const items = useInventoryStore((s) => s.items)
  const maxSlots = useInventoryStore((s) => s.maxSlots)
  const addItem = useInventoryStore((s) => s.addItem)
  const equipItem = usePlayerStore((s) => s.equipItem)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [tab, setTab] = useState<'bag' | 'equip'>('bag')

  const selectedItem = selectedIdx !== null ? items[selectedIdx] : null
  const equipmentItems = useMemo(() => items.filter((i): i is Equipment => i.type === 'equipment'), [items])

  const handleItemClick = (idx: number) => {
    setSelectedIdx(idx === selectedIdx ? null : idx)
  }

  const handleEquip = () => {
    if (!selectedItem || selectedItem.type !== 'equipment') return
    const slotIdx = getSlotIndex((selectedItem as Equipment).slot)
    equipItem(selectedItem.id, slotIdx)
  }

  const handleSlotClick = (slotIdx: number) => {
    if (selectedItem && selectedItem.type === 'equipment') {
      equipItem(selectedItem.id, slotIdx)
    }
  }

  const handleGenerate = () => {
    const item = generateEquipment('weapon', 'spirit')
    addItem(item)
  }

  return (
    <div className="page-content">
      <div className={styles.page}>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'bag' ? styles.tabActive : ''}`} onClick={() => setTab('bag')}>背包</button>
          <button className={`${styles.tab} ${tab === 'equip' ? styles.tabActive : ''}`} onClick={() => setTab('equip')}>装备</button>
        </div>

        {tab === 'bag' && (
          <>
            <div className={styles.toolbar}>
              <span className={styles.slotCount}>{items.length} / {maxSlots}</span>
              <button className={styles.devBtn} onClick={handleGenerate}>+ 测试装备</button>
            </div>
            <div className={styles.grid}>
              {items.map((item, idx) => (
                <ItemCard key={item.id} item={item} selected={selectedIdx === idx} onClick={() => handleItemClick(idx)} />
              ))}
              {Array.from({ length: maxSlots - items.length }).map((_, i) => (
                <ItemCard key={`empty-${i}`} item={null} />
              ))}
            </div>
          </>
        )}

        {tab === 'equip' && (
          <EquipPanel items={equipmentItems} onItemClick={(item) => {
            const idx = items.findIndex(i => i.id === item.id)
            setSelectedIdx(idx)
            setTab('bag')
          }} onSlotClick={handleSlotClick} />
        )}

        {selectedItem && selectedItem.type === 'equipment' && tab === 'bag' && (
          <div className={styles.detail}>
            <div className={styles.detailHeader}>
              <span style={{ color: `var(--color-quality-${selectedItem.quality})` }}>
                {QUALITY_NAMES[selectedItem.quality]} · {selectedItem.name}
              </span>
              {(selectedItem as Equipment).enhanceLevel > 0 && (
                <span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>
                  +{(selectedItem as Equipment).enhanceLevel}
                </span>
              )}
            </div>
            <div className={styles.detailStats}>
              {Object.entries((selectedItem as Equipment).stats).map(([k, v]) =>
                v > 0 ? <span key={k}>{k.toUpperCase()} +{v}  </span> : null
              )}
            </div>
            <button className={styles.equipBtn} onClick={handleEquip}>
              {EQUIP_SLOT_NAMES[(selectedItem as Equipment).slot]}
            </button>
            <EnhancePanel item={selectedItem as Equipment} onEnhanced={() => {}} />
          </div>
        )}
      </div>
    </div>
  )
}
