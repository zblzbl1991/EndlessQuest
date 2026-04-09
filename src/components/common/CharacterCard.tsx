import type { Character, CharacterQuality } from '../../types/character'
import type { TechniqueTier } from '../../types/technique'
import { getRealmName, getCultivationNeeded } from '../../data/realms'
import { getTechniqueById } from '../../data/techniquesTable'
import { calcEffectiveCultivationRate } from '../../systems/cultivation/CultivationDisplay'
import { getPathName } from '../../data/cultivationPaths'
import { getFateGridDef } from '../../data/fateGrids'
import { FATE_GRID_RARITY_NAMES } from '../../types/destiny'
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
  const statusSummary =
    character.status === 'recovering'
      ? `\u4F11\u517B ${Math.max(0, character.recoveryDaysRemaining ?? 0)} \u5929`
      : character.status === 'adventuring'
        ? '\u79D8\u5883\u4E2D'
        : character.status === 'patrolling'
          ? '\u6D3E\u9063\u4E2D'
          : primaryRole
            ? `\u4E3B\u5B9A\u4F4D ${getRoleLabel(primaryRole)}`
            : '\u5F85\u57F9\u517B'

  const fateGridDef = character.fateGrid ? getFateGridDef(character.fateGrid) : null

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
      <div className={styles.realm}>
        {realmName} Lv.{character.level ?? 1}
      </div>
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

      {fateGridDef && (
        <span className={styles.fateGridBadge} title={fateGridDef.description}>
          {fateGridDef.name} · {FATE_GRID_RARITY_NAMES[fateGridDef.rarity]}
        </span>
      )}

      <div className={styles.metaRow}>
        {primaryRole && <span className={styles.roleTag}>擅长 {getRoleLabel(primaryRole)}</span>}
        {character.status === 'recovering' && (
          <span className={styles.stateTag}>休养 {Math.max(0, character.recoveryDaysRemaining ?? 0)} 天</span>
        )}
      </div>
      <div className={styles.infoValue}>{statusSummary}</div>
      {specialtySummary.length > 0 && <div className={styles.specialtySummary}>{specialtySummary.join(' / ')}</div>}
      {character.learnedTechniques.length > 0 && (
        <div className={styles.techniques}>
          {character.learnedTechniques.slice(0, 2).map((techId) => {
            const tech = getTechniqueById(techId)
            if (!tech) return null
            return (
              <span key={techId} className={`${styles.techTag} ${TECHNIQUE_TIER_CLASS[tech.tier] ?? ''}`}>
                {tech.name}
              </span>
            )
          })}
          {character.learnedTechniques.length > 2 && (
            <span className={styles.techTag}>+{character.learnedTechniques.length - 2}</span>
          )}
        </div>
      )}
      {character.status === 'idle' && (
        <div className={styles.progress}>
          <ProgressBar value={character.cultivation} max={needed} variant="ink" />
          <div className={styles.progressStats}>
            <span>
              修为 {formatCultivationValue(character.cultivation)}/{needed.toLocaleString()}
            </span>
            <span>{'\u00B7'}</span>
            <span>+{effectiveCultivationSpeed.toFixed(1)}/s</span>
          </div>
        </div>
      )}
      {(() => {
        const level = character.level ?? 1
        const xp = character.xp ?? 0
        const xpNeeded = level * 100
        return (
          <div className={styles.xpProgress}>
            <ProgressBar value={xp} max={xpNeeded} variant="ink" />
            <div className={styles.progressStats}>
              <span>
                经验 {xp}/{xpNeeded}
              </span>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
