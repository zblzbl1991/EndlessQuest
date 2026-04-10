import { useSectStore } from '../../stores/sectStore'
import { EQUIPMENT_SETS, type EquipmentSet } from '../../data/equipmentSets'
import type { ItemQuality } from '../../types/item'
import { PixelIcon } from '../common/PixelIcon'
import styles from './CodexPanel.module.css'

const QUALITY_NAMES: Record<ItemQuality, string> = {
  common: '凡品',
  spirit: '灵品',
  immortal: '仙品',
  divine: '神品',
  chaos: '混沌',
}

const QUALITY_ORDER: ItemQuality[] = ['common', 'spirit', 'immortal', 'divine', 'chaos']

function getSetIconName(set: EquipmentSet): string {
  if (set.id === 'azureBlade') return 'swordManual'
  if (set.id === 'darkIron') return 'bodyPath'
  if (set.id === 'spiritLink') return 'spellPath'
  if (set.id === 'starShatter') return 'thunderArt'
  return 'techniqueScroll'
}

export default function EquipmentCodexPanel() {
  const equipmentCodex = useSectStore((s) => s.sect.equipmentCodex)

  let totalDiscovered = 0
  const totalEntries = EQUIPMENT_SETS.length * QUALITY_ORDER.length
  for (const qualities of Object.values(equipmentCodex)) {
    totalDiscovered += qualities.size
  }

  return (
    <div className={styles.codex}>
      <div className={styles.header}>
        <PixelIcon name="armor" size={20} className={styles.headerIcon} aria-label="Equipment Codex" />
        装备图鉴
      </div>
      <div className={styles.stats}>
        已收集 {totalDiscovered} / {totalEntries} 种套装品质组合
      </div>
      <div className={styles.grid}>
        {EQUIPMENT_SETS.map((set) => {
          const discoveredQualities = equipmentCodex[set.id]
          const hasAny = discoveredQualities && discoveredQualities.size > 0
          return (
            <div key={set.id} className={`${styles.card} ${hasAny ? styles.unlocked : styles.locked}`}>
              <div className={styles.cardName}>
                <PixelIcon
                  name={getSetIconName(set)}
                  size={18}
                  className={styles.cardIcon}
                  aria-label={hasAny ? set.name : 'Unknown set'}
                />
                {hasAny ? set.name : '???'}
              </div>
              <div className={styles.cardTier}>{hasAny ? set.description : '未发现'}</div>
              {hasAny && (
                <>
                  <div className={styles.tagRow}>
                    {QUALITY_ORDER.map((quality) => {
                      const found = discoveredQualities?.has(quality)
                      return (
                        <span key={quality} className={styles.cardTag} style={{ opacity: found ? 1 : 0.4 }}>
                          {QUALITY_NAMES[quality]}
                        </span>
                      )
                    })}
                  </div>
                  <div className={styles.cardDesc}>
                    <div>2件: {set.bonus2.description}</div>
                    <div>4件: {set.bonus4.description}</div>
                  </div>
                  <div className={styles.cardStats}>
                    <span>部位: {set.pieces.length}</span>
                    <span>已发现: {discoveredQualities?.size ?? 0}/5</span>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
