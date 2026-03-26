import { useSectStore } from '../../stores/sectStore'
import { TECHNIQUES } from '../../data/techniquesTable'
import { TECHNIQUE_TIER_NAMES } from '../../types/technique'
import type { TechniqueBonus } from '../../types/technique'
import styles from './CodexPanel.module.css'

function formatBonusValue(type: string, value: number): string {
  if (type === 'crit' || type === 'critDmg' || type === 'cultivationRate') {
    return `${type} +${Math.round(value * 100)}%`
  }
  return `${type} +${value}`
}

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
                  {tech.bonuses.map((b: TechniqueBonus, i: number) => (
                    <span key={i}>{formatBonusValue(b.type, b.value)}</span>
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
