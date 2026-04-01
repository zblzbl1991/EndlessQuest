import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useSectStore } from '../stores/sectStore'
import { useAdventureStore } from '../stores/adventureStore'
import { PixelIcon } from '../components/common/PixelIcon'
import ResourceRate from '../components/common/ResourceRate'
import CharacterCard from '../components/common/CharacterCard'
import ActionAgenda from '../components/sect/ActionAgenda'
import SectPathPanel from '../components/sect/SectPathPanel'
import LegacyPanel from '../components/sect/LegacyPanel'
import StatsPanel from '../components/sect/StatsPanel'
import styles from './SectPage.module.css'

function getSectCharacterStatusSummary(characters: ReturnType<typeof useSectStore.getState>['sect']['characters']) {
  return [
    {
      key: 'cultivating',
      label: '修炼中',
      icon: 'cultivation',
      count: characters.filter((char) => char.status === 'idle').length,
    },
    {
      key: 'dispatching',
      label: '派遣中',
      icon: 'dispatch',
      count: characters.filter((char) => char.status === 'patrolling').length,
    },
    {
      key: 'adventuring',
      label: '秘境中',
      icon: 'adventure',
      count: characters.filter((char) => char.status === 'adventuring').length,
    },
    {
      key: 'training',
      label: '研习中',
      icon: 'technique',
      count: characters.filter((char) => char.status === 'training').length,
    },
    {
      key: 'recovering',
      label: '恢复中',
      icon: 'recovery',
      count: characters.filter((char) => char.status === 'resting' || char.status === 'injured').length,
    },
  ]
}

function getDungeonIconName(dungeonId: string): string {
  switch (dungeonId) {
    case 'lingCaoValley':
      return 'dungeonValley'
    case 'luoYunCave':
      return 'dungeonCave'
    case 'bloodDemonAbyss':
      return 'dungeonAbyss'
    case 'dragonBoneWasteland':
      return 'dungeonWasteland'
    case 'nineNetherPurgatory':
      return 'dungeonPurgatory'
    case 'heavenlyTribulationRealm':
      return 'dungeonTribulation'
    default:
      return 'dungeonCave'
  }
}

export default function SectPage() {
  const sect = useSectStore((s) => s.sect)
  const reports = useAdventureStore((s) => s.reports)
  const dungeons = useAdventureStore((s) => s.dungeons)

  const characterStats = useMemo(() => getSectCharacterStatusSummary(sect.characters), [sect.characters])
  const spiritFieldLevel = sect.buildings.find((b) => b.type === 'spiritField')?.level ?? 0
  const herbRate = spiritFieldLevel > 0 ? 0.1 * spiritFieldLevel : 0

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <div className={styles.headerEyebrow}>山门总览</div>
          <h1 className={styles.sectName}>{sect.name}</h1>
        </div>
        <span className={styles.sectLevel}>宗门等级 {sect.level}</span>
      </div>

      <section className={`${styles.section} ${styles.heroSection}`} data-testid="sect-hero">
        <div className={styles.sectionTitle}>宗门近况</div>
        <div className={styles.heroCard}>
          <div className={styles.heroLead}>
            <span className={styles.heroLine}>山门静开，内务与冒险各有流转。</span>
            <span className={styles.heroHint}>此处只呈现当前最值得留意的变化，不替你排定先后。</span>
          </div>
          <ActionAgenda />
        </div>
      </section>

      <div className={styles.midgroundGrid} data-testid="sect-midground-grid">
        <section className={styles.section}>
          <div className={styles.sectionTitle}>资源总览</div>
          <div className={styles.resourceGrid}>
            <div className={styles.resourceCard}>
              <PixelIcon name="spiritStone" size={18} className={styles.inlineIcon} aria-label="灵石" />
              <span className={styles.resourceLabel}>灵石</span>
              <span className={styles.resourceValue}>{Math.floor(sect.resources.spiritStone).toLocaleString()}</span>
            </div>
            <div className={styles.resourceCard}>
              <PixelIcon name="spiritEnergy" size={18} className={styles.inlineIcon} aria-label="灵气" />
              <span className={styles.resourceLabel}>灵气</span>
              <span className={styles.resourceValue}>{Math.floor(sect.resources.spiritEnergy).toLocaleString()}</span>
            </div>
            <div className={styles.resourceCard}>
              <PixelIcon name="herb" size={18} className={styles.inlineIcon} aria-label="灵草" />
              <span className={styles.resourceLabel}>灵草</span>
              <span className={styles.resourceValue}>{Math.floor(sect.resources.herb).toLocaleString()}</span>
            </div>
            <div className={styles.resourceCard}>
              <PixelIcon name="ore" size={18} className={styles.inlineIcon} aria-label="矿材" />
              <span className={styles.resourceLabel}>矿材</span>
              <span className={styles.resourceValue}>{Math.floor(sect.resources.ore).toLocaleString()}</span>
            </div>
          </div>
          <div className={styles.rateRow}>
            <ResourceRate />
            {herbRate > 0 && <span className={styles.herbRate}>灵草 +{herbRate.toFixed(2)}/s</span>}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionTitle}>弟子概况</div>
          <div className={styles.statsRow}>
            {characterStats.map((item) => (
              <span key={item.key} className={styles.statItem}>
                <PixelIcon name={item.icon} size={16} className={styles.inlineIcon} aria-label={item.label} />
                <span className={styles.statCount}>{item.count}</span>
                <span className={styles.statLabel}>{item.label}</span>
              </span>
            ))}
          </div>
        </section>

        {reports.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionTitle}>最近探险</div>
            {reports.slice(0, 3).map((report) => {
              const dungeon = dungeons.find((item) => item.id === report.dungeonId)
              return (
                <div key={report.id} className={styles.adventureItem}>
                  <div>
                    <span className={styles.adventureName}>
                      <PixelIcon
                        name={getDungeonIconName(report.dungeonId)}
                        size={16}
                        className={styles.inlineIcon}
                        aria-label={dungeon?.name ?? report.dungeonId}
                      />
                      {dungeon?.name ?? report.dungeonId}
                    </span>
                    <span className={styles.adventureFloor}>
                      {report.result === 'completed' ? '通关' : report.result === 'retreated' ? '撤退' : '失败'} · 第
                      {report.floorsCleared} 层
                    </span>
                  </div>
                  <Link className={styles.adventureLink} to={`/adventure/report/${report.id}`}>
                    查看详情
                  </Link>
                </div>
              )
            })}
          </section>
        )}
      </div>

      <div className={styles.backgroundStack}>
        <SectPathPanel />
        <LegacyPanel />
        <StatsPanel />
      </div>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>弟子列表</div>
        <div className={styles.characterList}>
          {sect.characters.map((char) => (
            <CharacterCard key={char.id} character={char} />
          ))}
        </div>
      </section>
    </div>
  )
}
