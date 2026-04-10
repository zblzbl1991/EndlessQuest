import { useSectStore } from '../../stores/sectStore'
import { TECHNIQUES } from '../../data/techniquesTable'
import { TECHNIQUE_TIER_NAMES } from '../../types/technique'
import type { Technique, TechniqueBonus, TechniqueFamily, TechniqueStyle } from '../../types/technique'
import { getTechniqueCodexCapacity } from '../../systems/technique/TechniqueSystem'
import { PixelIcon } from '../common/PixelIcon'
import styles from './CodexPanel.module.css'

const FAMILY_LABELS: Record<TechniqueFamily, string> = {
  qi: 'Qi',
  body: 'Body',
  weapon: 'Weapon',
  mystic: 'Mystic',
}

const STYLE_LABELS: Record<TechniqueStyle, string> = {
  balanced: 'Balanced',
  burst: 'Burst',
  guard: 'Guard',
  tempo: 'Tempo',
  cultivation: 'Cultivate',
  survival: 'Survival',
}

function formatBonusValue(type: string, value: number): string {
  if (type === 'crit' || type === 'critDmg' || type === 'cultivationRate') {
    return `${type} +${Math.round(value * 100)}%`
  }
  return `${type} +${value}`
}

function getTechniqueIconName(technique: Technique): string {
  if (technique.family === 'weapon') return 'swordManual'
  if (technique.family === 'body') return 'bodyPath'
  if (technique.element === 'metal') return 'thunderArt'
  if (technique.element === 'fire' || technique.element === 'water') return 'spellPath'
  return 'techniqueScroll'
}

export default function CodexPanel() {
  const sect = useSectStore((state) => state.sect)
  const scriptureLevel = sect.buildings.find((building) => building.type === 'scriptureHall')?.level ?? 0
  const capacity = getTechniqueCodexCapacity(scriptureLevel)

  const familyCounts = TECHNIQUES.reduce<Record<TechniqueFamily, number>>(
    (accumulator, technique) => {
      if (sect.techniqueCodex.includes(technique.id)) {
        accumulator[technique.family] += 1
      }
      return accumulator
    },
    { qi: 0, body: 0, weapon: 0, mystic: 0 }
  )

  return (
    <div className={styles.codex}>
      <div className={styles.header}>
        <PixelIcon name="technique" size={20} className={styles.headerIcon} aria-label="Technique Codex" />
        Technique Codex
      </div>
      <div className={styles.stats}>
        Collected {sect.techniqueCodex.length} / {capacity} codex slots. Total manuals in game: {TECHNIQUES.length}
      </div>
      <div className={styles.familyRow}>
        {Object.entries(FAMILY_LABELS).map(([family, label]) => (
          <div key={family} className={styles.familyChip}>
            <span>{label}</span>
            <strong>{familyCounts[family as TechniqueFamily]}</strong>
          </div>
        ))}
      </div>
      <div className={styles.grid}>
        {TECHNIQUES.map((technique) => {
          const unlocked = sect.techniqueCodex.includes(technique.id)
          return (
            <div key={technique.id} className={`${styles.card} ${unlocked ? styles.unlocked : styles.locked}`}>
              <div className={styles.cardName}>
                <PixelIcon
                  name={getTechniqueIconName(technique)}
                  size={18}
                  className={styles.cardIcon}
                  aria-label={unlocked ? technique.name : 'Locked technique'}
                />
                {unlocked ? technique.name : '???'}
              </div>
              <div className={styles.cardTier}>{TECHNIQUE_TIER_NAMES[technique.tier]}</div>
              {unlocked && (
                <>
                  <div className={styles.tagRow}>
                    <span className={styles.cardTag}>{FAMILY_LABELS[technique.family]}</span>
                    {technique.styles.map((style) => (
                      <span key={style} className={styles.cardTag}>
                        {STYLE_LABELS[style]}
                      </span>
                    ))}
                  </div>
                  <div className={styles.cardDesc}>{technique.description}</div>
                  <div className={styles.cardStats}>
                    {technique.bonuses.map((bonus: TechniqueBonus, index: number) => (
                      <span key={`${bonus.type}-${index}`}>{formatBonusValue(bonus.type, bonus.value)}</span>
                    ))}
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
