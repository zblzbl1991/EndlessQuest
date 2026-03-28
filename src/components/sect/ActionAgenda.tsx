import { useSectStore } from '../../stores/sectStore'
import styles from './ActionAgenda.module.css'

type Variant = 'urgent' | 'progress' | 'action' | 'blocked'

const CARD_VARIANT: Record<Variant, string> = {
  urgent: styles.urgent ?? '',
  progress: styles.progress ?? '',
  action: styles.action ?? '',
  blocked: styles.blocked ?? '',
}

const CTA_VARIANT: Record<Variant, string> = {
  urgent: styles.urgentCta ?? '',
  progress: styles.progressCta ?? '',
  action: styles.actionCta ?? '',
  blocked: styles.blockedCta ?? '',
}

interface AgendaItem {
  key: string
  title: string
  description: string
  progress?: number
  cta: string
  variant: Variant
}

export default function ActionAgenda() {
  const breakthrough = useSectStore((s) => s.getBreakthroughCandidate())
  const building = useSectStore((s) => s.getNextBuildingUpgrade())
  const dungeon = useSectStore((s) => s.getRecommendedDungeon())

  const items: AgendaItem[] = [
    ...(breakthrough
      ? [{
          key: 'breakthrough',
          title: '突破在即',
          description: `${breakthrough.characterName} (${breakthrough.realmName})`,
          progress: breakthrough.progress,
          cta: breakthrough.progress >= 1 ? '立即突破' : `${Math.round(breakthrough.progress * 100)}%`,
          variant: (breakthrough.progress >= 1 ? 'urgent' : 'progress') as Variant,
        }]
      : []),
    ...(building
      ? [{
          key: 'building',
          title: building.isUnlock ? '解锁建筑' : '升级建筑',
          description: `${building.buildingName} — ${building.cost.toLocaleString()} 灵石`,
          cta: building.canAfford ? '前往升级' : '灵石不足',
          variant: (building.canAfford ? 'action' : 'blocked') as Variant,
        }]
      : []),
    ...(dungeon
      ? [{
          key: 'dungeon',
          title: dungeon.unlocked ? '秘境探险' : '下一秘境',
          description: dungeon.unlocked
            ? `${dungeon.dungeonName} 已解锁`
            : `${dungeon.dungeonName} 未解锁`,
          cta: dungeon.unlocked ? '出发探险' : '提升境界',
          variant: (dungeon.unlocked ? 'action' : 'blocked') as Variant,
        }]
      : []),
  ]

  if (items.length === 0) return null

  return (
    <div className={styles.agenda}>
      {items.map((item) => (
        <div key={item.key} className={`${styles.card} ${CARD_VARIANT[item.variant]}`}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>{item.title}</span>
            {item.variant === 'blocked' && (
              <span className={styles.blockedBadge}>未满足</span>
            )}
            {item.variant === 'urgent' && (
              <span className={styles.urgentBadge}>就绪</span>
            )}
          </div>
          <div className={styles.cardDescription}>{item.description}</div>
          {item.progress !== undefined && (
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${Math.round(item.progress * 100)}%` }}
              />
            </div>
          )}
          <div className={`${styles.cta} ${CTA_VARIANT[item.variant]}`}>
            {item.cta}
          </div>
        </div>
      ))}
    </div>
  )
}
