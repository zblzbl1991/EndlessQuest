import { useMemo } from 'react'
import { useSectStore } from '../stores/sectStore'
import { useGameStore } from '../stores/gameStore'
import { calcMaxDisciplesByResources } from '../systems/sect/SectEngine'
import { getDominantDarkCurrentFamily } from '../systems/destiny/DarkCurrentSystem'
import { SECT_RISK_POLICY_LIST } from '../data/sectRiskPolicies'
import { DESTINY_STAGE_NAMES, DESTINY_RISK_NAMES } from '../types/destiny'
import type { DestinyRiskLevel } from '../types/destiny'
import { PixelIcon } from '../components/common/PixelIcon'
import PageHeader from '../components/common/PageHeader'
import ResourceRate from '../components/common/ResourceRate'
import StrategyPanel from '../components/sect/StrategyPanel'
import SectPathPanel from '../components/sect/SectPathPanel'
import LegacyPanel from '../components/sect/LegacyPanel'
import StatsPanel from '../components/sect/StatsPanel'
import { clearSaveData } from '../systems/save/SaveSystem'
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

const RISK_LEVEL_TONE: Record<DestinyRiskLevel, string> = {
  safe: styles.riskSafe,
  drifting: styles.riskDrifting,
  danger: styles.riskDanger,
  calamity: styles.riskCalamity,
}

export default function SectPage() {
  const sect = useSectStore((s) => s.sect)
  const resetSect = useSectStore((s) => s.reset)
  const resetGame = useGameStore((s) => s.reset)

  const characterStats = useMemo(() => getSectCharacterStatusSummary(sect.characters), [sect.characters])
  const spiritFieldLevel = sect.buildings.find((b) => b.type === 'spiritField')?.level ?? 0
  const spiritFieldCount = sect.buildings.find((b) => b.type === 'spiritField')?.count ?? 0
  const herbRate = spiritFieldLevel > 0 ? 0.1 * spiritFieldLevel * spiritFieldCount : 0

  const dominantDarkCurrent = useMemo(() => getDominantDarkCurrentFamily(sect.darkCurrent), [sect.darkCurrent])

  const policyName = SECT_RISK_POLICY_LIST.find((p) => p.id === sect.strategySettings.activePolicy)?.name ?? '审机'

  // Identify disciples with notable destiny states
  const notableDisciples = useMemo(() => {
    return sect.characters
      .filter((c) => c.destinyState && c.destinyState.stage !== 'seed')
      .sort((a, b) => {
        const order = { heavenmarked: 4, mutated: 3, formed: 2, stirring: 1, seed: 0 }
        return (order[b.destinyState!.stage] ?? 0) - (order[a.destinyState!.stage] ?? 0)
      })
      .slice(0, 3)
  }, [sect.characters])

  const handleResetSect = async () => {
    if (!window.confirm('确认重置当前宗门档案吗？此操作会清空当前进度。')) {
      return
    }

    resetSect()
    // Also reset adventure store
    const { useAdventureStore } = await import('../stores/adventureStore')
    useAdventureStore.getState().reset()
    resetGame()
    await clearSaveData()
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title={sect.name}
        testId="sect-hero"
        action={
          <button type="button" className={styles.resetButton} onClick={handleResetSect}>
            重置宗门
          </button>
        }
        metrics={[
          { label: '宗门等级', value: sect.level, detail: `${sect.characters.length} 弟子 · ${sect.pets.length} 灵宠` },
          {
            label: '宗门方针',
            value: policyName,
            detail: `核心上限 ${SECT_RISK_POLICY_LIST.find((p) => p.id === sect.strategySettings.activePolicy)?.maxCoreDisciples ?? 2} 人`,
          },
          {
            label: '自动运转',
            value: '运行中',
            detail: `资源可养 ${calcMaxDisciplesByResources(sect.buildings, sect.characters, sect.activeRoute)} 人`,
          },
          {
            label: '宗门暗流',
            value: dominantDarkCurrent ? dominantDarkCurrent.value : '平静',
            detail: dominantDarkCurrent ? `${dominantDarkCurrent.tier}` : '暂无波动',
          },
        ]}
      />

      <div className={styles.midgroundGrid} data-testid="sect-midground-grid">
        <section className={styles.section}>
          <div className={styles.sectionTitle}>资源</div>
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
          <div className={styles.sectionTitle}>弟子</div>
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
      </div>

      {/* Notable disciples with destiny activity */}
      {notableDisciples.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionTitle}>命运动向</div>
          <div className={styles.destinyList}>
            {notableDisciples.map((char) => {
              const ds = char.destinyState!
              return (
                <div key={char.id} className={styles.destinyItem}>
                  <div className={styles.destinyLeft}>
                    <span className={styles.destinyName}>{char.name}</span>
                    <span className={styles.destinyStage}>{DESTINY_STAGE_NAMES[ds.stage]}</span>
                  </div>
                  <div className={styles.destinyRight}>
                    <span className={`${styles.destinyRisk} ${RISK_LEVEL_TONE[ds.riskLevel]}`}>
                      {DESTINY_RISK_NAMES[ds.riskLevel]}
                    </span>
                    <span className={styles.destinyExposure}>曝露 {Math.floor(ds.exposure)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <StrategyPanel />

      <div className={styles.backgroundStack}>
        <SectPathPanel />
        <LegacyPanel />
        <StatsPanel />
      </div>
    </div>
  )
}
