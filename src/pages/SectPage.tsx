import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useSectStore } from '../stores/sectStore'
import { useAdventureStore } from '../stores/adventureStore'
import ResourceRate from '../components/common/ResourceRate'
import CharacterCard from '../components/common/CharacterCard'
import SectPathPanel from '../components/sect/SectPathPanel'
import LegacyPanel from '../components/sect/LegacyPanel'
import StatsPanel from '../components/sect/StatsPanel'
import styles from './SectPage.module.css'

function getSectCharacterStatusSummary(characters: ReturnType<typeof useSectStore.getState>['sect']['characters']) {
  return [
    { key: 'cultivating', label: '修炼中', count: characters.filter((char) => char.status === 'idle').length },
    { key: 'dispatching', label: '派遣中', count: characters.filter((char) => char.status === 'patrolling').length },
    { key: 'adventuring', label: '秘境中', count: characters.filter((char) => char.status === 'adventuring').length },
    { key: 'training', label: '研习中', count: characters.filter((char) => char.status === 'training').length },
    {
      key: 'recovering',
      label: '恢复中',
      count: characters.filter((char) => char.status === 'resting' || char.status === 'injured').length,
    },
  ]
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
      {/* Sect Header */}
      <div className={styles.header}>
        <h1 className={styles.sectName}>{sect.name}</h1>
        <span className={styles.sectLevel}>宗门等级 {sect.level}</span>
      </div>

      {/* Resource Overview */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>资源总览</div>
        <div className={styles.resourceGrid}>
          <div className={styles.resourceCard}>
            <span className={styles.resourceLabel}>灵石</span>
            <span className={styles.resourceValue}>{Math.floor(sect.resources.spiritStone).toLocaleString()}</span>
          </div>
          <div className={styles.resourceCard}>
            <span className={styles.resourceLabel}>灵气</span>
            <span className={styles.resourceValue}>{Math.floor(sect.resources.spiritEnergy).toLocaleString()}</span>
          </div>
          <div className={styles.resourceCard}>
            <span className={styles.resourceLabel}>灵草</span>
            <span className={styles.resourceValue}>{Math.floor(sect.resources.herb).toLocaleString()}</span>
          </div>
          <div className={styles.resourceCard}>
            <span className={styles.resourceLabel}>矿石</span>
            <span className={styles.resourceValue}>{Math.floor(sect.resources.ore).toLocaleString()}</span>
          </div>
        </div>
        <div className={styles.rateRow}>
          <ResourceRate />
          {herbRate > 0 && <span className={styles.herbRate}>灵草 +{herbRate.toFixed(2)}/s</span>}
        </div>
      </section>

      {/* Sect Path */}
      <SectPathPanel />

      {/* Legacy Ascension */}
      <LegacyPanel />

      {/* Statistics */}
      <StatsPanel />

      {/* Character Stats */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>弟子概况</div>
        <div className={styles.statsRow}>
          {characterStats.map((item) => (
            <span key={item.key} className={styles.statItem}>
              <span className={styles.statCount}>{item.count}</span>
              <span className={styles.statLabel}>{item.label}</span>
            </span>
          ))}
        </div>
      </section>

      {/* Recent Adventure */}
      {reports.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionTitle}>最近探索</div>
          {reports.slice(0, 3).map((report) => {
            const dungeon = dungeons.find((item) => item.id === report.dungeonId)
            return (
              <div key={report.id} className={styles.adventureItem}>
                <div>
                  <span className={styles.adventureName}>{dungeon?.name ?? report.dungeonId}</span>
                  <span className={styles.adventureFloor}>
                    {report.result === 'completed' ? '通关' : report.result === 'retreated' ? '撤退' : '失败'} · 第{' '}
                    {report.floorsCleared} 层
                  </span>
                </div>
                <Link className={styles.adventureLink} to={`/adventure/report/${report.id}`}>
                  查看明细
                </Link>
              </div>
            )
          })}
        </section>
      )}

      {/* Character List (compact) */}
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
