import { useSectStore } from '../../stores/sectStore'
import { TECHNIQUES } from '../../data/techniquesTable'
import { TECHNIQUE_TIER_NAMES } from '../../types/technique'
import type { Technique, TechniqueBonus } from '../../types/technique'
import { PixelIcon } from '../common/PixelIcon'
import styles from './CodexPanel.module.css'

function formatBonusValue(type: string, value: number): string {
  if (type === 'crit' || type === 'critDmg' || type === 'cultivationRate') {
    return `${type} +${Math.round(value * 100)}%`
  }
  return `${type} +${value}`
}

function getTechniqueIconName(tech: Technique): string {
  if (tech.name.includes('剑')) return 'swordManual'
  if (tech.name.includes('兽')) return 'beastTaming'
  if (tech.element === 'lightning') return 'thunderArt'
  if (tech.name.includes('体') || tech.name.includes('金身')) return 'bodyPath'
  if (tech.element === 'fire' || tech.element === 'ice') return 'spellPath'
  return 'techniqueScroll'
}

export default function CodexPanel() {
  const techniqueCodex = useSectStore((s) => s.sect.techniqueCodex)

  return (
    <div className={styles.codex}>
      <div className={styles.header}>
        <PixelIcon name="technique" size={20} className={styles.headerIcon} aria-label="功法图鉴" />
        功法图鉴
      </div>
      <div className={styles.stats}>
        已收集 {techniqueCodex.length} / {TECHNIQUES.length}
      </div>
      <div className={styles.grid}>
        {TECHNIQUES.map((tech) => {
          const unlocked = techniqueCodex.includes(tech.id)
          return (
            <div key={tech.id} className={`${styles.card} ${unlocked ? styles.unlocked : styles.locked}`}>
              <div className={styles.cardName}>
                <PixelIcon
                  name={getTechniqueIconName(tech)}
                  size={18}
                  className={styles.cardIcon}
                  aria-label={unlocked ? tech.name : '未解锁功法'}
                />
                {unlocked ? tech.name : '???'}
              </div>
              <div className={styles.cardTier}>{TECHNIQUE_TIER_NAMES[tech.tier]}</div>
              {unlocked && <div className={styles.cardDesc}>{tech.description}</div>}
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
