import { useSectStore } from '../../stores/sectStore'
import { TECHNIQUES } from '../../data/techniquesTable'
import { TECHNIQUE_TIER_NAMES } from '../../types/technique'
import styles from './CodexPanel.module.css'

export default function CodexPanel() {
  const techniqueCodex = useSectStore((s) => s.sect.techniqueCodex)

  return (
    <div className={styles.codex}>
      <div className={styles.header}>功法图鉴</div>
      <div className={styles.stats}>
        已收集 {techniqueCodex.length} / {TECHNIQUES.length}
      </div>
      <div className={styles.grid}>
        {TECHNIQUES.map((tech) => {
          const unlocked = techniqueCodex.includes(tech.id)
          return (
            <div key={tech.id} className={`${styles.card} ${unlocked ? styles.unlocked : styles.locked}`}>
              <div className={styles.cardName}>{unlocked ? tech.name : '???'}</div>
              <div className={styles.cardTier}>{TECHNIQUE_TIER_NAMES[tech.tier]}</div>
              {unlocked && (
                <div className={styles.cardDesc}>{tech.description}</div>
              )}
              {unlocked && (
                <div className={styles.cardStats}>
                  {Object.entries(tech.growthModifiers)
                    .filter(([, v]) => v !== 1)
                    .map(([k, v]) => (
                      <span key={k}>{k} {v > 1 ? `+${Math.round((v - 1) * 100)}%` : `${Math.round((v - 1) * 100)}%`}</span>
                    ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
