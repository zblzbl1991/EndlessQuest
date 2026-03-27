import { useState, useMemo } from 'react'
import { useSectStore } from '../stores/sectStore'
import { QUALITY_NAMES, EQUIP_SLOT_NAMES } from '../data/items'
import { getEffectiveStats } from '../systems/equipment/EquipmentEngine'
import { getTechniqueById } from '../data/techniquesTable'
import { TECHNIQUE_TIER_NAMES } from '../types/technique'
import ItemCard from '../components/inventory/ItemCard'
import styles from './VaultPage.module.css'
import type { Equipment, TechniqueScroll } from '../types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type Tab = 'vault' | 'backpack'

const TABS: { key: Tab; label: string }[] = [
  { key: 'vault', label: '宗门仓库' },
  { key: 'backpack', label: '弟子背包' },
]

// ---------------------------------------------------------------------------
// VaultPage
// ---------------------------------------------------------------------------

export default function VaultPage() {
  const [tab, setTab] = useState<Tab>('vault')

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>仓库</h1>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabBar}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'vault' && <VaultTab />}
      {tab === 'backpack' && <BackpackTab />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// VaultTab
// ---------------------------------------------------------------------------

function VaultTab() {
  const vault = useSectStore((s) => s.sect.vault)
  const maxSlots = useSectStore((s) => s.sect.maxVaultSlots)
  const sellItem = useSectStore((s) => s.sellItem)
  const transferItemToCharacter = useSectStore((s) => s.transferItemToCharacter)
  const characters = useSectStore((s) => s.sect.characters)

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [showCharSelector, setShowCharSelector] = useState(false)

  const selectedStack = selectedIndex !== null ? vault[selectedIndex] ?? null : null
  const selectedItem = selectedStack?.item ?? null

  // Characters with available backpack space
  const eligibleCharacters = useMemo(() => {
    return characters.filter(
      (c) => c.backpack.length < c.maxBackpackSlots
    )
  }, [characters])

  const handleSell = () => {
    if (selectedIndex === null) return
    sellItem(selectedIndex)
    setSelectedIndex(null)
  }

  const handleTransferToChar = (charId: string) => {
    if (selectedIndex === null) return
    transferItemToCharacter(charId, selectedIndex)
    setSelectedIndex(null)
    setShowCharSelector(false)
  }

  return (
    <div className={styles.tabContent}>
      <div className={styles.slotCount}>
        物品 {vault.length} / {maxSlots}
      </div>

      {vault.length === 0 ? (
        <div className={styles.empty}>仓库为空</div>
      ) : (
        <div className={styles.itemGrid}>
          {vault.map((stack, idx) => (
            <div key={stack.item.id + '-' + idx} className={styles.itemWrapper}>
              <ItemCard
                item={stack.item}
                selected={selectedIndex === idx}
                onClick={() => setSelectedIndex(selectedIndex === idx ? null : idx)}
              />
              {stack.quantity > 1 && <span className={styles.quantityBadge}>x{stack.quantity}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Item Detail / Actions */}
      {selectedItem && selectedIndex !== null && (
        <div className={styles.itemDetail}>
          <div className={styles.detailName}>{selectedItem.name}</div>
          <div className={styles.detailQuality} style={{ color: `var(--color-quality-${selectedItem.quality})` }}>
            {QUALITY_NAMES[selectedItem.quality]}
          </div>
          <div className={styles.detailPrice}>售价: {selectedItem.sellPrice} 灵石</div>
          <div className={styles.detailDesc}>{selectedItem.description}</div>

          {/* Equipment stats */}
          {selectedItem.type === 'equipment' && (
            <div className={styles.detailStats}>
              {formatEquipStats(selectedItem as Equipment)}
            </div>
          )}

          {/* Technique scroll info */}
          {selectedItem.type === 'techniqueScroll' && (
            <div className={styles.detailTechnique}>
              {(() => {
                const tech = getTechniqueById((selectedItem as TechniqueScroll).techniqueId)
                if (!tech) return null
                return (
                  <>
                    <div>功法: {tech.name}</div>
                    <div>品阶: {TECHNIQUE_TIER_NAMES[tech.tier]}</div>
                  </>
                )
              })()}
            </div>
          )}

          {/* Action buttons */}
          <div className={styles.detailActions}>
            <button className={styles.actionSell} onClick={handleSell}>
              出售
            </button>
            <button
              className={styles.actionTransfer}
              onClick={() => setShowCharSelector(!showCharSelector)}
            >
              装备给弟子
            </button>
          </div>

          {/* Character selector */}
          {showCharSelector && (
            <div className={styles.charSelector}>
              {eligibleCharacters.length === 0 ? (
                <div className={styles.empty}>无可用弟子</div>
              ) : (
                eligibleCharacters.map((char) => (
                  <button
                    key={char.id}
                    className={styles.charOption}
                    onClick={() => handleTransferToChar(char.id)}
                  >
                    {char.name} ({char.backpack.length}/{char.maxBackpackSlots})
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// BackpackTab
// ---------------------------------------------------------------------------

function BackpackTab() {
  const characters = useSectStore((s) => s.sect.characters)
  const equipItem = useSectStore((s) => s.equipItem)
  const transferItemToVault = useSectStore((s) => s.transferItemToVault)
  const sellCharacterItem = useSectStore((s) => s.sellCharacterItem)
  // selectedKey: "charId-index" compound key for per-character selection
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const handleEquip = (charId: string, bpIdx: number) => {
    const character = characters.find((c) => c.id === charId)
    if (!character) return
    const stack = character.backpack[bpIdx]
    if (!stack || stack.item.type !== 'equipment') return
    const item = stack.item as Equipment
    const slotIndex = ['head', 'armor', 'bracer', 'belt', 'boots', 'weapon', 'accessory1', 'accessory2', 'talisman']
      .indexOf(item.slot)
    if (slotIndex >= 0) {
      equipItem(charId, bpIdx, slotIndex)
    }
    setSelectedKey(null)
  }

  const handleTransferToVault = (charId: string, bpIdx: number) => {
    transferItemToVault(charId, bpIdx)
    setSelectedKey(null)
  }

  const handleSell = (charId: string, bpIdx: number) => {
    sellCharacterItem(charId, bpIdx)
    setSelectedKey(null)
  }

  if (characters.length === 0) {
    return (
      <div className={styles.tabContent}>
        <div className={styles.empty}>暂无弟子</div>
      </div>
    )
  }

  return (
    <div className={styles.tabContent}>
      {characters.map((char) => {
        const key = (idx: number) => `${char.id}-${idx}`
        const bp = char.backpack
        const selCharId = selectedKey?.split('-')[0]
        const selIdx = selectedKey ? parseInt(selectedKey.split('-').slice(1).join('-'), 10) : null
        const isThisChar = selCharId === char.id
        const selectedStack = isThisChar && selIdx !== null ? bp[selIdx] ?? null : null
        const selectedItem = selectedStack?.item ?? null

        return (
          <div key={char.id} className={styles.charSection}>
            <div className={styles.charSectionHeader}>
              <span className={styles.charSectionName}>{char.name}</span>
              <span className={styles.charSectionCount}>{bp.length}/{char.maxBackpackSlots}</span>
            </div>

            {bp.length === 0 ? (
              <div className={styles.empty}>背包为空</div>
            ) : (
              <div className={styles.itemGrid}>
                {bp.map((stack, idx) => (
                  <div key={stack.item.id + '-' + idx} className={styles.itemWrapper}>
                    <ItemCard
                      item={stack.item}
                      selected={isThisChar && selIdx === idx}
                      onClick={() => setSelectedKey(selectedKey === key(idx) ? null : key(idx))}
                    />
                    {stack.quantity > 1 && <span className={styles.quantityBadge}>x{stack.quantity}</span>}
                  </div>
                ))}
              </div>
            )}

            {selectedItem && isThisChar && selIdx !== null && (
              <div className={styles.itemDetail}>
                <div className={styles.detailName}>{selectedItem.name}</div>
                <div className={styles.detailQuality} style={{ color: `var(--color-quality-${selectedItem.quality})` }}>
                  {QUALITY_NAMES[selectedItem.quality]}
                </div>
                <div className={styles.detailPrice}>售价: {selectedItem.sellPrice} 灵石</div>

                <div className={styles.detailActions}>
                  {selectedItem.type === 'equipment' && (
                    <button
                      className={styles.actionEquip}
                      onClick={() => handleEquip(char.id, selIdx)}
                    >
                      装备
                    </button>
                  )}
                  <button
                    className={styles.actionTransfer}
                    onClick={() => handleTransferToVault(char.id, selIdx)}
                  >
                    转移到仓库
                  </button>
                  <button
                    className={styles.actionSell}
                    onClick={() => handleSell(char.id, selIdx)}
                  >
                    出售
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatEquipStats(item: Equipment): React.ReactNode {
  const stats = getEffectiveStats(item)
  const parts: string[] = []
  if (stats.hp > 0) parts.push(`气血 +${stats.hp}`)
  if (stats.atk > 0) parts.push(`攻击 +${stats.atk}`)
  if (stats.def > 0) parts.push(`防御 +${stats.def}`)
  if (stats.spd > 0) parts.push(`速度 +${stats.spd}`)
  if (stats.crit > 0) parts.push(`暴击 +${Math.round(stats.crit * 100)}%`)
  if (stats.critDmg > 0) parts.push(`暴伤 +${Math.round(stats.critDmg * 100)}%`)

  return (
    <div className={styles.equipStats}>
      <div>部位: {EQUIP_SLOT_NAMES[item.slot] ?? item.slot}</div>
      {item.enhanceLevel > 0 && <div>强化: +{item.enhanceLevel}</div>}
      {parts.map((p, i) => <div key={i}>{p}</div>)}
    </div>
  )
}
