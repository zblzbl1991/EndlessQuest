import type { Character, CharacterQuality } from '../../types/character'
import type { TechniqueTier } from '../../types/technique'
import { getRealmName, getCultivationNeeded } from '../../data/realms'
import { getTechniqueById } from '../../data/techniquesTable'
import { calcEffectiveCultivationRate } from '../../systems/cultivation/CultivationDisplay'
import { getPathName } from '../../data/cultivationPaths'
import { getFateTagDef } from '../../data/fateTags'
import { getPrimaryRole, getRoleLabel } from '../../systems/character/SpecialtySystem'
import { formatCultivationValue } from '../../utils/format'
import { useSectStore } from '../../stores/sectStore'
import { PixelIcon } from './PixelIcon'
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

const PATH_ICON_NAMES: Record<string, string> = {
  sword: 'swordPath',
  body: 'bodyPath',
  alchemy: 'alchemyPath',
  beast: 'beastPath',
  formation: 'spellPath',
  void: 'spellPath',
}

interface CharacterCardProps {
  character: Character
  onClick?: () => void
}

export default function CharacterCard({ character, onClick }: CharacterCardProps) {
  const sect = useSectStore((s) => s.sect)
  const TECHNIQUE_TIER_CLASS: Record<TechniqueTier, string> = {
    mortal: styles.techMortal,
    spirit: styles.techSpirit,
    immortal: styles.techImmortal,
    divine: styles.techDivine,
    chaos: styles.techChaos,
  }

  const realmName = getRealmName(character.realm, character.realmStage)
  const needed = getCultivationNeeded(character.realm, character.realmStage)
  const effectiveCultivationSpeed = calcEffectiveCultivationRate(sect, character)
  const primaryRole = getPrimaryRole(character)
  const specialtySummary = character.specialties
    .slice(0, 2)
    .map((specialty) => `${getRoleLabel(specialty.type)} Lv.${specialty.level}`)
  const cultivationDirection =
    character.cultivationPath !== 'none' ? getPathName(character.cultivationPath) : '未定路线'
  const statusSummary =
    character.status === 'recovering'
      ? `恢复剩余 ${Math.max(0, character.recoveryDaysRemaining ?? 0)} 天`
      : character.status === 'adventuring'
        ? '当前正在秘境中'
        : character.status === 'patrolling'
          ? '当前执行派遣任务'
          : primaryRole
            ? `主定位 ${getRoleLabel(primaryRole)}`
            : '待定培养方向'

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
      {character.cultivationPath !== 'none' && (
        <span className={styles.pathTag}>
          <PixelIcon
            name={PATH_ICON_NAMES[character.cultivationPath] ?? 'technique'}
            size={16}
            className={styles.pathIcon}
            aria-label={getPathName(character.cultivationPath)}
          />
          {getPathName(character.cultivationPath)}
        </span>
      )}
      <div className={styles.metaRow}>
        <span className={styles.roleTag}>{cultivationDirection}</span>
        {primaryRole && <span className={styles.roleTag}>擅长 {getRoleLabel(primaryRole)}</span>}
        {character.status === 'recovering' && (
          <span className={styles.stateTag}>休养 {Math.max(0, character.recoveryDaysRemaining ?? 0)} 天</span>
        )}
      </div>
      <div className={styles.infoValue}>{statusSummary}</div>
      {specialtySummary.length > 0 && <div className={styles.specialtySummary}>{specialtySummary.join(' / ')}</div>}
      {character.fateTags.length > 0 && (
        <div className={styles.fateTags}>
          {character.fateTags.map((tag) => {
            const def = getFateTagDef(tag)
            return (
              <span
                key={tag}
                className={`${styles.fateTag} ${
                  def.tone === 'danger'
                    ? styles.fateDanger
                    : def.tone === 'positive'
                      ? styles.fatePositive
                      : styles.fateAccent
                }`}
                title={def.description}
              >
                {def.name}
              </span>
            )
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
            <span>
              修为 {formatCultivationValue(character.cultivation)}/{needed.toLocaleString()}
            </span>
            <span>·</span>
            <span>+{effectiveCultivationSpeed.toFixed(1)}/s</span>
          </div>
        </div>
      )}
    </div>
  )
}

export { QUALITY_NAMES }
