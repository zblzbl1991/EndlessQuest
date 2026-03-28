import type { Character, CharacterQuality } from '../../types/character'
import type { TechniqueTier } from '../../types/technique'
import { getRealmName, getCultivationNeeded } from '../../data/realms'
import { getTechniqueById } from '../../data/techniquesTable'
import { calcCultivationRate } from '../../systems/cultivation/CultivationEngine'
import { FATE_TAGS } from '../../data/fateTags'
import StatusBadge from './StatusBadge'
import ProgressBar from './ProgressBar'
import styles from './CharacterCard.module.css'

const QUALITY_BORDER: Record<CharacterQuality, string> = {
  common: styles.qualityCommon,
  spirit: styles.qualitySpirit,
  immortal: styles.qualityImmortal,
  divine: styles.qualityDivine,
  chaos: styles.qualityChaos,
}

const QUALITY_NAMES: Record<CharacterQuality, string> = {
  common: '凡',
  spirit: '灵',
  immortal: '仙',
  divine: '神',
  chaos: '混沌',
}

interface CharacterCardProps {
  character: Character
  onClick?: () => void
}

export default function CharacterCard({ character, onClick }: CharacterCardProps) {
  const TECHNIQUE_TIER_CLASS: Record<TechniqueTier, string> = {
    mortal: styles.techMortal,
    spirit: styles.techSpirit,
    immortal: styles.techImmortal,
    divine: styles.techDivine,
    chaos: styles.techChaos,
  }

  const realmName = getRealmName(character.realm, character.realmStage)
  const needed = getCultivationNeeded(character.realm, character.realmStage)

  return (
    <div
      className={`${styles.card} ${QUALITY_BORDER[character.quality] ?? ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className={styles.header}>
        <span className={styles.name}>{character.name}</span>
        <StatusBadge status={character.status} />
      </div>
      <div className={styles.realm}>{realmName}</div>
      {character.fateTags.length > 0 && (
        <div className={styles.fateTags}>
          {character.fateTags.map((tagId) => {
            const tag = FATE_TAGS[tagId]
            return tag ? (
              <span key={tagId} className={styles.fateTagChip}>{tag.name}</span>
            ) : null
          })}
        </div>
      )}
      {character.learnedTechniques.length > 0 && (
        <div className={styles.techniques}>
          {character.learnedTechniques.map((techId) => {
            const tech = getTechniqueById(techId)
            if (!tech) return null
            return (
              <span key={techId} className={`${styles.techTag} ${TECHNIQUE_TIER_CLASS[tech.tier] ?? ''}`}>
                {tech.name}
              </span>
            )
          })}
        </div>
      )}
      {character.status === 'idle' && (
        <div className={styles.progress}>
          <ProgressBar value={character.cultivation} max={needed} variant="ink" />
          <div className={styles.progressStats}>
            <span>修为 {Math.floor(character.cultivation).toLocaleString()}/{needed.toLocaleString()}</span>
            <span>·</span>
            <span>+{calcCultivationRate(character, character.learnedTechniques).toFixed(1)}/s</span>
          </div>
        </div>
      )}
    </div>
  )
}

export { QUALITY_NAMES }
