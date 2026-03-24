import type { Character, CharacterQuality } from '../../types/character'
import { getRealmName, getCultivationNeeded } from '../../data/realms'
import { getTechniqueById } from '../../data/techniquesTable'
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
  const realmName = getRealmName(character.realm, character.realmStage)
  const needed = getCultivationNeeded(character.realm, character.realmStage)
  const technique = character.currentTechnique
    ? getTechniqueById(character.currentTechnique)
    : null

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
      <div className={styles.technique}>
        {technique ? technique.name : '无功法'}
      </div>
      {character.status === 'cultivating' && (
        <div className={styles.progress}>
          <ProgressBar value={character.cultivation} max={needed} variant="ink" />
        </div>
      )}
    </div>
  )
}

export { QUALITY_NAMES }
