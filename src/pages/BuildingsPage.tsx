import { useState } from 'react'
import { useSectStore } from '../stores/sectStore'
import { BUILDING_DEFS, getSpiritFieldRate } from '../data/buildings'
import { getMaxCharacters } from '../systems/character/CharacterEngine'
import type { BuildingType, CharacterQuality } from '../types'
import type { AnyItem } from '../types/item'
import ItemCard from '../components/inventory/ItemCard'
import styles from './BuildingsPage.module.css'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type TabKey = 'buildings' | 'recruit' | 'vault'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'buildings', label: '建筑' },
  { key: 'recruit', label: '招收' },
  { key: 'vault', label: '仓库' },
]

const QUALITY_OPTIONS: { quality: CharacterQuality; label: string; unlockLevel: number }[] = [
  { quality: 'common', label: '凡品', unlockLevel: 1 },
  { quality: 'spirit', label: '灵品', unlockLevel: 2 },
  { quality: 'immortal', label: '仙品', unlockLevel: 3 },
  { quality: 'divine', label: '神品', unlockLevel: 4 },
]

const QUALITY_LABELS: Record<CharacterQuality, string> = {
  common: '凡品',
  spirit: '灵品',
  immortal: '仙品',
  divine: '神品',
  chaos: '混沌',
}

// ---------------------------------------------------------------------------
// BuildingsPage
// ---------------------------------------------------------------------------

export default function BuildingsPage() {
  const [tab, setTab] = useState<TabKey>('buildings')

  return (
    <div className={styles.page}>
      <div className={styles.tabs}>
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

      {tab === 'buildings' && <BuildingsTab />}
      {tab === 'recruit' && <RecruitTab />}
      {tab === 'vault' && <VaultTab />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// BuildingsTab
// ---------------------------------------------------------------------------

function BuildingsTab() {
  const sect = useSectStore((s) => s.sect)
  const tryUpgradeBuilding = useSectStore((s) => s.tryUpgradeBuilding)
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null)

  const handleUpgrade = (type: BuildingType) => {
    const result = tryUpgradeBuilding(type)
    if (result.success) {
      setMessage({ success: true, text: '升级成功' })
    } else {
      setMessage({ success: false, text: result.reason })
    }
    setTimeout(() => setMessage(null), 2000)
  }

  return (
    <div className={styles.buildingsGrid}>
      {BUILDING_DEFS.map((def) => {
        const building = sect.buildings.find((b) => b.type === def.type)
        if (!building) return null

        const isUnlocked = building.unlocked
        const isMaxLevel = building.level >= def.maxLevel
        const cost = def.upgradeCost(building.level)
        const canAfford = sect.resources.spiritStone >= cost.spiritStone
        const spiritRate = def.type === 'spiritField' ? getSpiritFieldRate(building.level) : 0

        return (
          <div key={def.type} className={`${styles.buildingCard} ${!isUnlocked ? styles.buildingLocked : ''}`}>
            <div className={styles.buildingHeader}>
              <span className={styles.buildingName}>{def.name}</span>
              <span className={styles.buildingLevel}>
                Lv{building.level}{isMaxLevel ? ' MAX' : ''}
              </span>
            </div>
            <div className={styles.buildingDesc}>{def.description}</div>
            {spiritRate > 0 && (
              <div className={styles.buildingEffect}>
                灵气产出: +{spiritRate}/s
              </div>
            )}
            {isUnlocked && !isMaxLevel && (
              <button
                className={`${styles.upgradeBtn} ${canAfford ? styles.upgradeReady : styles.upgradeDisabled}`}
                onClick={() => handleUpgrade(def.type)}
                disabled={!canAfford}
              >
                升级 ({cost.spiritStone}灵石)
              </button>
            )}
            {isMaxLevel && (
              <span className={styles.maxLevelTag}>已满级</span>
            )}
            {!isUnlocked && (
              <div className={styles.unlockInfo}>
                <span className={styles.unlockCondition}>解锁条件: {def.unlockCondition}</span>
              </div>
            )}
          </div>
        )
      })}
      {message && (
        <div className={`${styles.message} ${message.success ? styles.messageSuccess : styles.messageFail}`}>
          {message.text}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// RecruitTab
// ---------------------------------------------------------------------------

function RecruitTab() {
  const sect = useSectStore((s) => s.sect)
  const addCharacter = useSectStore((s) => s.addCharacter)
  const [selectedQuality, setSelectedQuality] = useState<CharacterQuality>('common')
  const [newCharacter, setNewCharacter] = useState<string | null>(null)

  const maxChars = getMaxCharacters(sect.level)
  const isFull = sect.characters.length >= maxChars

  const handleRecruit = () => {
    if (isFull) return
    const character = addCharacter(selectedQuality)
    if (character) {
      setNewCharacter(character.name)
      setTimeout(() => setNewCharacter(null), 3000)
    }
  }

  return (
    <div className={styles.recruitPanel}>
      <div className={styles.recruitInfo}>
        <span className={styles.recruitCount}>
          弟子数量: {sect.characters.length} / {maxChars}
        </span>
      </div>

      <div className={styles.qualitySelect}>
        {QUALITY_OPTIONS.map((q) => {
          const available = sect.level >= q.unlockLevel
          return (
            <button
              key={q.quality}
              className={`${styles.qualityBtn} ${selectedQuality === q.quality ? styles.qualityActive : ''} ${!available ? styles.qualityLocked : ''}`}
              onClick={() => available && setSelectedQuality(q.quality)}
              disabled={!available}
            >
              {q.label}
              {!available && <span className={styles.qualityLockHint}> Lv{q.unlockLevel}解锁</span>}
            </button>
          )
        })}
      </div>

      <button
        className={`${styles.recruitBtn} ${isFull ? styles.recruitDisabled : ''}`}
        onClick={handleRecruit}
        disabled={isFull}
      >
        {isFull ? '弟子已满' : `招收${QUALITY_LABELS[selectedQuality]}弟子`}
      </button>

      {newCharacter && (
        <div className={styles.recruitResult}>
          成功招收弟子: {newCharacter}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// VaultTab
// ---------------------------------------------------------------------------

function VaultTab() {
  const sect = useSectStore((s) => s.sect)
  const sellItem = useSectStore((s) => s.sellItem)
  const transferItemToCharacter = useSectStore((s) => s.transferItemToCharacter)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [showTransferSelect, setShowTransferSelect] = useState(false)

  const handleSell = (idx: number) => {
    sellItem(idx)
    setSelectedIdx(null)
  }

  const handleTransferStart = () => {
    setShowTransferSelect(true)
  }

  const handleTransferTo = (characterId: string) => {
    if (selectedIdx === null) return
    transferItemToCharacter(characterId, selectedIdx)
    setSelectedIdx(null)
    setShowTransferSelect(false)
  }

  return (
    <div className={styles.vaultPanel}>
      <div className={styles.vaultCapacity}>
        仓库容量: {sect.vault.length} / {sect.maxVaultSlots}
      </div>

      <div className={styles.vaultGrid}>
        {sect.vault.map((item: AnyItem, idx: number) => (
          <div key={idx} className={styles.vaultItemWrapper}>
            <ItemCard
              item={item}
              selected={selectedIdx === idx}
              onClick={() => setSelectedIdx(selectedIdx === idx ? null : idx)}
            />
            {selectedIdx === idx && (
              <div className={styles.vaultItemActions}>
                <button className={styles.vaultActionBtn} onClick={() => handleSell(idx)}>
                  出售 ({item.sellPrice}灵石)
                </button>
                <button className={styles.vaultActionBtn} onClick={handleTransferStart}>
                  转给弟子
                </button>
              </div>
            )}
          </div>
        ))}
        {sect.vault.length === 0 && (
          <div className={styles.empty}>仓库为空</div>
        )}
      </div>

      {/* Character select for transfer */}
      {showTransferSelect && (
        <div className={styles.transferModal}>
          <div className={styles.transferModalContent}>
            <div className={styles.transferTitle}>选择弟子</div>
            {sect.characters.map((char) => (
              <button
                key={char.id}
                className={styles.transferCharBtn}
                onClick={() => handleTransferTo(char.id)}
              >
                {char.name} ({char.backpack.length}/{char.maxBackpackSlots})
              </button>
            ))}
            <button
              className={styles.cancelBtn}
              onClick={() => {
                setShowTransferSelect(false)
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
