import { useState } from 'react'
import { useSectStore } from '../../stores/sectStore'
import { TECHNIQUES } from '../../data/techniquesTable'
import { countTechniqueCodexSlots, getTechniqueCodexCapacity } from '../../systems/technique/TechniqueSystem'
import { PixelIcon } from '../common/PixelIcon'
import styles from './StudyPanel.module.css'

export default function StudyPanel() {
  const sect = useSectStore((state) => state.sect)
  const studyTechnique = useSectStore((state) => state.studyTechnique)
  const [message, setMessage] = useState<string | null>(null)

  const scriptureLevel = sect.buildings.find((building) => building.type === 'scriptureHall')?.level ?? 0
  const capacity = getTechniqueCodexCapacity(scriptureLevel)
  const starterCount = sect.techniqueCodex.filter(
    (techniqueId) => TECHNIQUES.find((technique) => technique.id === techniqueId)?.origin === 'starter'
  ).length
  const dungeonCount = sect.techniqueCodex.filter(
    (techniqueId) => TECHNIQUES.find((technique) => technique.id === techniqueId)?.origin === 'dungeon'
  ).length
  const legacyCount = sect.techniqueCodex.filter(
    (techniqueId) => TECHNIQUES.find((technique) => technique.id === techniqueId)?.origin === 'legacy'
  ).length
  const occupiedSlots = countTechniqueCodexSlots(sect.techniqueCodex)
  const remaining = Math.max(0, capacity - occupiedSlots)

  const handleInspect = () => {
    const result = studyTechnique()
    setMessage(result.reason)
    setTimeout(() => setMessage(null), 2500)
  }

  return (
    <div className={styles.buildingPanel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>
          <PixelIcon name="scriptureHall" size={20} className={styles.panelIcon} aria-label="Scripture Hall" />
          Scripture Hall Lv{scriptureLevel}
        </span>
        <span className={styles.resourceDisplay}>
          Codex {occupiedSlots} / {capacity}
        </span>
      </div>

      <div className={styles.studyInfo}>
        <div className={styles.studyDesc}>
          Scripture Hall is now a collection building. It does not mint new manuals by itself. Its job is to expand how
          many techniques your sect can archive at once.
        </div>

        <div className={styles.studyMetaRow}>
          <div className={styles.metaCard}>
            <span className={styles.metaLabel}>Codex Cap</span>
            <strong className={styles.metaValue}>{capacity}</strong>
          </div>
          <div className={styles.metaCard}>
            <span className={styles.metaLabel}>Open Slots</span>
            <strong className={styles.metaValue}>{remaining}</strong>
          </div>
          <div className={styles.metaCard}>
            <span className={styles.metaLabel}>Dungeon Finds</span>
            <strong className={styles.metaValue}>{dungeonCount}</strong>
          </div>
          <div className={styles.metaCard}>
            <span className={styles.metaLabel}>Legacy Inheritances</span>
            <strong className={styles.metaValue}>{legacyCount}</strong>
          </div>
        </div>

        <div className={styles.ruleList}>
          <div className={styles.ruleItem}>1. Start with 3 basic manuals in the sect codex.</div>
          <div className={styles.ruleItem}>
            2. Dungeon manuals fill normal codex slots, while legacy inheritances stay outside the slot cap.
          </div>
          <div className={styles.ruleItem}>3. Breakthroughs comprehend from the codex based on character affinity.</div>
          <div className={styles.ruleItem}>4. Duplicate discoveries can become fragments, not direct power spikes.</div>
        </div>

        <div className={styles.studyDesc}>
          Current collection mix: {starterCount} starter manuals, {dungeonCount} dungeon manuals, {legacyCount} legacy
          manuals, {TECHNIQUES.length - sect.techniqueCodex.length} still undiscovered.
        </div>

        <button className={styles.inspectButton} onClick={handleInspect}>
          Inspect Hall Rule
        </button>
      </div>

      {message && <div className={styles.message}>{message}</div>}
    </div>
  )
}
