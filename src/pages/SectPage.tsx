import { useMemo, useState } from 'react'
import { useSectStore } from '../stores/sectStore'
import { useGameStore } from '../stores/gameStore'
import { useEventLogStore } from '../stores/eventLogStore'
import { useAdventureStore } from '../stores/adventureStore'

import { calcResourceRates, calcSpiritStoneCap } from '../systems/economy/ResourceEngine'
import { getActiveSynergies } from '../systems/economy/SynergySystem'
import { SYNERGIES } from '../data/buildings'
import { SECT_RISK_POLICY_LIST } from '../data/sectRiskPolicies'
import { getFateGridDef } from '../data/fateGrids'
import { FATE_GRID_RARITY_NAMES } from '../types/destiny'
import type { FateGridRarity } from '../types/destiny'
import {
  getExpeditionTemplateSignal,
  getFallbackRuleLabel,
  getRewardFocusLabel,
  getSpecialExpeditionTemplateCount,
  getTeamRuleLabel,
  getVisibleExpeditionTemplates,
} from '../data/expeditionTemplates'
import { PixelIcon } from '../components/common/PixelIcon'
import PageHeader from '../components/common/PageHeader'
import ResourceRate from '../components/common/ResourceRate'
import StrategyPanel from '../components/sect/StrategyPanel'
import SectPathPanel from '../components/sect/SectPathPanel'
import LegacyPanel from '../components/sect/LegacyPanel'
import StatsPanel from '../components/sect/StatsPanel'
import ActionAgenda from '../components/sect/ActionAgenda'
import { clearSaveData } from '../systems/save/SaveSystem'
import { diagnoseSectBottlenecks } from '../systems/sect/SectBottleneckSystem'
import { buildSectRumors } from '../systems/sect/SectRumorSystem'
import { getLegacyTemplateCapacity, getUnlockedLegacyPerks } from '../data/legacy'
import { buildSectStageGoals } from '../systems/sect/SectGoalSystem'
import { getArchetypeDescriptor, SECT_ARCHETYPES } from '../data/sectArchetypes'
import { getCampaignDescriptor } from '../data/productionCampaigns'
import { canShiftArchetype } from '../systems/sect/SectArchetypeSystem'
import type { SectArchetype } from '../types/sect'
import styles from './SectPage.module.css'

/** Map each archetype to its most different (opposite playstyle) archetype. */
const OPPOSITE_ARCHETYPES: Record<string, string> = {
  swordBurst: 'pillSustain',
  pillSustain: 'swordBurst',
  arrayGuard: 'beastHarvest',
  beastHarvest: 'arrayGuard',
}

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

const RARITY_ORDER: Record<FateGridRarity, number> = { legendary: 4, epic: 3, rare: 2, common: 1 }

/** Static data — computed once at module level. */
const UNIQUE_SYNERGY_TOTAL = SYNERGIES.filter((s, i) => SYNERGIES.findIndex((o) => o.id === s.id) === i).length

export default function SectPage() {
  const sect = useSectStore((s) => s.sect)
  const resetSect = useSectStore((s) => s.reset)
  const setPolicy = useSectStore((s) => s.setPolicy)
  const resetGame = useGameStore((s) => s.reset)
  const dayProgressSec = useGameStore((s) => s.dayProgressSec)
  const recentEvents = useEventLogStore((s) => s.events)
  const recentReports = useAdventureStore((s) => s.reports)
  const reportDetails = useAdventureStore((s) => s.reportDetails)
  const dungeons = useAdventureStore((s) => s.dungeons)
  const [policyHint, setPolicyHint] = useState<string | null>(null)

  const characterStats = useMemo(() => getSectCharacterStatusSummary(sect.characters), [sect.characters])

  const { spiritFieldLevel, spiritFieldCount, mainHallLevel } = useMemo(() => {
    const sf = sect.buildings.find((b) => b.type === 'spiritField')
    const mh = sect.buildings.find((b) => b.type === 'mainHall')
    return {
      spiritFieldLevel: sf?.level ?? 0,
      spiritFieldCount: sf?.count ?? 0,
      mainHallLevel: mh?.level ?? 1,
    }
  }, [sect.buildings])

  const herbRate = spiritFieldLevel > 0 ? 0.1 * spiritFieldLevel * spiritFieldCount : 0
  const spiritStoneCap = calcSpiritStoneCap(mainHallLevel)
  const spiritStoneRatio = sect.resources.spiritStone / spiritStoneCap
  const activeSynergyCount = useMemo(() => getActiveSynergies(sect.buildings).length, [sect.buildings])

  const policyName = SECT_RISK_POLICY_LIST.find((p) => p.id === sect.strategySettings.activePolicy)?.name ?? '均衡'
  const templateCapacity = getLegacyTemplateCapacity(sect.legacy.ascensionCount)
  const visibleTemplates = getVisibleExpeditionTemplates(
    sect.automationSettings.expeditionTemplates,
    sect.legacy.ascensionCount,
    sect.archiveMilestones
  )
  const specialTemplateCount = getSpecialExpeditionTemplateCount(sect.archiveMilestones)
  const activeTemplate =
    visibleTemplates.find((template) => template.id === sect.automationSettings.activeTemplateId) ??
    visibleTemplates[0] ??
    null
  const activeTemplateSignal = activeTemplate
    ? getExpeditionTemplateSignal(activeTemplate.id, sect.archiveMilestones)
    : null
  const activeTemplateLoopYield = useMemo(() => {
    if (activeTemplate?.id !== 'guixuResonance') return null

    const latestGuixuReport = recentReports
      .filter((report) => report.dungeonId === 'guixuRift')
      .map((report) => reportDetails[report.id])
      .find((report) => Boolean(report))

    if (!latestGuixuReport) return null

    const tideCrystalCount = latestGuixuReport.itemRewards.filter((item) => item.name === '归墟潮晶').length
    const abyssShardCount = latestGuixuReport.itemRewards.filter((item) => item.name === '渊息残片').length
    if (tideCrystalCount === 0 && abyssShardCount === 0) return null

    return {
      tideCrystalCount,
      abyssShardCount,
      floorsCleared: latestGuixuReport.floorsCleared,
    }
  }, [activeTemplate?.id, recentReports, reportDetails])
  const latestTemplateAdjustment = useMemo(
    () =>
      recentEvents.find(
        (event) => event.type === 'automation_adjusted' && event.data?.templateId === activeTemplate?.id
      ) ?? null,
    [activeTemplate?.id, recentEvents]
  )
  const legacyPerks = useMemo(() => getUnlockedLegacyPerks(sect.legacy.ascensionCount), [sect.legacy.ascensionCount])
  const bottlenecks = useMemo(() => diagnoseSectBottlenecks(sect), [sect])
  const sectRumors = useMemo(
    () =>
      buildSectRumors(
        recentEvents.slice(0, 8).map((event) => ({
          id: event.id,
          type: event.type,
          message: event.message,
          data: event.data,
        })),
        3
      ),
    [recentEvents]
  )
  const stageGoals = useMemo(() => buildSectStageGoals(sect, recentReports, dungeons), [sect, recentReports, dungeons])
  const nextAutoRunInDays = Math.max(0, 5 - (sect.autoRunDayCounter ?? 0))
  const nextAutoRunInSeconds = Math.max(0, nextAutoRunInDays * 60 - dayProgressSec)
  const nextCyclePreview = useMemo(() => {
    const forecastWindowSec = Math.max(60, nextAutoRunInDays * 60)
    const rates = calcResourceRates(
      {
        spiritField: spiritFieldLevel,
        spiritFieldCount,
        spiritMine: sect.buildings.find((b) => b.type === 'spiritMine')?.level ?? 0,
        spiritMineCount: sect.buildings.find((b) => b.type === 'spiritMine')?.count ?? 0,
        mainHall: mainHallLevel,
      },
      { techniqueMultiplier: 1, discipleMultiplier: 1 }
    )

    return {
      spiritStone: Math.floor(rates.spiritStone * forecastWindowSec),
      spiritEnergy: Math.floor(rates.spiritEnergy * forecastWindowSec),
      herb: Math.floor(rates.herb * forecastWindowSec),
      ore: Math.floor(rates.ore * forecastWindowSec),
    }
  }, [mainHallLevel, nextAutoRunInDays, sect.buildings, spiritFieldCount, spiritFieldLevel])

  // Identify disciples with notable fate grids, sorted by rarity
  const notableDisciples = useMemo(() => {
    return sect.characters
      .filter((c) => c.fateGrid)
      .sort((a, b) => {
        const aDef = getFateGridDef(a.fateGrid!)
        const bDef = getFateGridDef(b.fateGrid!)
        return (RARITY_ORDER[bDef.rarity] ?? 0) - (RARITY_ORDER[aDef.rarity] ?? 0)
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

  const handlePolicyChange = (policyId: (typeof SECT_RISK_POLICY_LIST)[number]['id']) => {
    const result = setPolicy(policyId)
    setPolicyHint(
      result.success
        ? `宗门方针已调整为${SECT_RISK_POLICY_LIST.find((policy) => policy.id === policyId)?.name}`
        : result.reason
    )
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
        ]}
      />

      <section className={`${styles.section} ${styles.heroSection}`}>
        <div className={styles.heroCard}>
          <div className={styles.heroLead}>
            <span className={styles.heroLine}>宗门总控台</span>
            <span className={styles.heroHint}>现在的重点是稳住瓶颈、校准远征模板，再让宗门自己往前滚。</span>
            {policyHint ? <span className={styles.policyHint}>{policyHint}</span> : null}
            <div className={styles.controlCard}>
              <span className={styles.controlLabel}>轮回遗产</span>
              <strong className={styles.controlValue}>{legacyPerks.length} 项</strong>
              <span className={styles.controlMeta}>
                模板位已开放 {templateCapacity} 个
                {specialTemplateCount > 0 ? `，另有 ${specialTemplateCount} 个共鸣模板` : ''}
                ，继续飞升会解锁更多挂机权限
              </span>
            </div>
          </div>

          <div className={styles.controlSummary}>
            <div className={styles.controlCard}>
              <span className={styles.controlLabel}>当前方针</span>
              <strong className={styles.controlValue}>{policyName}</strong>
              <span className={styles.controlMeta}>影响自动远征风格与核心弟子使用倾向</span>
            </div>
            <div className={styles.controlCard}>
              <span className={styles.controlLabel}>挂机模板</span>
              <strong className={styles.controlValue}>{activeTemplate?.name ?? '未设定'}</strong>
              <span className={styles.controlMeta}>
                {activeTemplate
                  ? `${getRewardFocusLabel(activeTemplate.rewardFocus)} · ${getTeamRuleLabel(activeTemplate.teamRule)}${
                      activeTemplateSignal ? ` · ${activeTemplateSignal.label}` : ''
                    }`
                  : '需前往秘境页补齐模板'}
              </span>
              {activeTemplateSignal ? <span className={styles.controlMeta}>{activeTemplateSignal.detail}</span> : null}
              {latestTemplateAdjustment ? (
                <span
                  className={`${styles.controlMeta} ${styles.templateAdjustmentMeta}`}
                  data-testid="sect-template-adjustment"
                >
                  {latestTemplateAdjustment.message}
                </span>
              ) : null}
              {activeTemplateLoopYield ? (
                <span className={`${styles.controlMeta} ${styles.loopYieldMeta}`} data-testid="sect-guixu-loop-yield">
                  最近一轮归墟回响带回 潮晶 {activeTemplateLoopYield.tideCrystalCount} · 残片{' '}
                  {activeTemplateLoopYield.abyssShardCount} · 推进至第 {activeTemplateLoopYield.floorsCleared} 层
                </span>
              ) : null}
            </div>
            <div className={styles.controlCard}>
              <span className={styles.controlLabel}>下一轮远征</span>
              <strong className={styles.controlValue}>{Math.ceil(nextAutoRunInSeconds)} 秒</strong>
              <span className={styles.controlMeta}>按每 5 个游戏日自动尝试一次</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>宗门路线</div>
        <div className={styles.archetypeCard}>
          {(() => {
            const archetype = sect.currentArchetype
            const desc = getArchetypeDescriptor(archetype)
            const routeShift = sect.automationSettings.routeShift
            const isBlending = routeShift.blendDaysRemaining > 0
            // Check cooldown status for display
            const cooldownCheck = canShiftArchetype(
              routeShift,
              useGameStore.getState().currentGameDay,
              'swordBurst' as SectArchetype
            )
            const cooldownActive = !cooldownCheck.canShift && cooldownCheck.reason.includes('冷却')
            return (
              <div>
                <div className={styles.archetypeHeader}>
                  <span className={styles.archetypeName}>{desc.name}</span>
                  {isBlending && (
                    <span className={styles.archetypeBlend}>磨合期 {routeShift.blendDaysRemaining} 日</span>
                  )}
                  {cooldownActive && <span className={styles.archetypeCooldown}>{cooldownCheck.reason}</span>}
                </div>
                <div className={styles.archetypeSummary}>{desc.summary}</div>
                <div className={styles.archetypeDetails}>
                  <div className={styles.archetypeStrengths}>
                    {desc.strengths.map((s, i) => (
                      <span key={i} className={styles.archetypeStrength}>
                        + {s}
                      </span>
                    ))}
                  </div>
                  <div className={styles.archetypeWeaknesses}>
                    {desc.weaknesses.map((s, i) => (
                      <span key={i} className={styles.archetypeWeakness}>
                        - {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })()}
          <div className={styles.archetypeSwitch}>
            {SECT_ARCHETYPES.filter((a) => a.id !== sect.currentArchetype).map((a) => {
              const check = canShiftArchetype(
                sect.automationSettings.routeShift,
                useGameStore.getState().currentGameDay,
                a.id
              )
              return (
                <button
                  key={a.id}
                  className={styles.archetypeSwitchBtn}
                  onClick={() => {
                    const result = useSectStore.getState().setArchetype(a.id)
                    if (!result.success) {
                      setPolicyHint(result.reason)
                      setTimeout(() => setPolicyHint(null), 3000)
                    }
                  }}
                  title={!check.canShift ? check.reason : undefined}
                >
                  {a.name}
                  {!check.canShift && <span className={styles.archetypeBtnCooldown}> ({check.reason})</span>}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {(() => {
        const campaignState = sect.automationSettings.productionCampaign
        return (
          <section className={styles.section}>
            <div className={styles.sectionTitle}>当前专项</div>
            {campaignState.activeCampaign ? (
              (() => {
                const desc = getCampaignDescriptor(campaignState.activeCampaign)
                return (
                  <div className={styles.campaignCard}>
                    <div className={styles.campaignHeader}>
                      <span className={styles.campaignName}>{desc.name}</span>
                      <span className={styles.campaignDuration}>持续 {campaignState.durationHours} 小时</span>
                    </div>
                    <div className={styles.campaignSummary}>{desc.summary}</div>
                    <div className={styles.campaignDetails}>
                      <div className={styles.campaignBoosts}>
                        {desc.boosts.map((b, i) => (
                          <span key={i} className={styles.campaignBoost}>
                            + {b}
                          </span>
                        ))}
                      </div>
                      <div className={styles.campaignSuppressions}>
                        {desc.suppressions.map((s, i) => (
                          <span key={i} className={styles.campaignSuppression}>
                            - {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })()
            ) : (
              <div className={styles.campaignEmpty}>
                <span className={styles.campaignEmptyText}>暂无进行中的专项</span>
                <span className={styles.campaignEmptyHint}>前往建筑页启动专项生产</span>
              </div>
            )}
          </section>
        )
      })()}

      <section className={styles.section}>
        <div className={styles.sectionTitle}>今日宗务</div>
        <ActionAgenda />
      </section>

      {sectRumors.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionTitle}>山门风闻</div>
          <div className={styles.rumorGrid}>
            {sectRumors.map((rumor) => (
              <div
                key={rumor.id}
                className={`${styles.rumorCard} ${
                  rumor.tone === 'good'
                    ? styles.rumorGood
                    : rumor.tone === 'warn'
                      ? styles.rumorWarn
                      : styles.rumorAccent
                }`}
              >
                <div className={styles.rumorTitle}>{rumor.title}</div>
                <div className={styles.rumorDetail}>{rumor.detail}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={styles.section}>
        <div className={styles.sectionTitle}>瓶颈诊断</div>
        {stageGoals.length > 0 && (
          <div className={styles.goalSection}>
            <div className={styles.goalSectionTitle}>阶段目标</div>
            <div className={styles.goalGrid}>
              {stageGoals.map((goal) => (
                <div
                  key={goal.id}
                  className={`${styles.goalCard} ${
                    goal.priority === 'high'
                      ? styles.goalHigh
                      : goal.priority === 'medium'
                        ? styles.goalMedium
                        : styles.goalLow
                  }`}
                >
                  <div className={styles.goalHeader}>
                    <span className={styles.goalTitle}>{goal.title}</span>
                    <span className={styles.goalProgress}>{goal.progress}</span>
                  </div>
                  <div className={styles.goalDetail}>{goal.detail}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className={styles.dualPathSection}>
          <div className={styles.dualPathTitle}>路径选择</div>
          <div className={styles.dualPathGrid}>
            {(() => {
              const currentArchetype = sect.currentArchetype
              const desc = getArchetypeDescriptor(currentArchetype)
              // Pick the most different playstyle as alternative suggestion
              const suggested = OPPOSITE_ARCHETYPES[currentArchetype] ?? 'swordBurst'
              const suggestedDesc = getArchetypeDescriptor(suggested as SectArchetype)
              return (
                <>
                  <div className={styles.dualPathCard}>
                    <span className={styles.dualPathLabel}>当前路径</span>
                    <span className={styles.dualPathName}>{desc.name}</span>
                    <span className={styles.dualPathSummary}>{desc.summary}</span>
                    <span className={styles.dualPathBenefit}>
                      专注建筑：
                      {desc.focusBuildings
                        .map((b) => {
                          const names: Record<string, string> = {
                            mainHall: '主殿',
                            spiritField: '灵田',
                            spiritMine: '灵矿',
                            market: '坊市',
                            alchemyFurnace: '丹炉',
                            forge: '锻器坊',
                            scriptureHall: '藏经阁',
                            recruitmentPavilion: '聚仙台',
                          }
                          return names[b] ?? b
                        })
                        .join('、')}
                    </span>
                  </div>
                  <div className={`${styles.dualPathCard} ${styles.dualPathAlt}`}>
                    <span className={styles.dualPathLabel}>备选路径</span>
                    <span className={styles.dualPathName}>{suggestedDesc.name}</span>
                    <span className={styles.dualPathSummary}>{suggestedDesc.summary}</span>
                    <span className={styles.dualPathBenefit}>
                      专注建筑：
                      {suggestedDesc.focusBuildings
                        .map((b) => {
                          const names: Record<string, string> = {
                            mainHall: '主殿',
                            spiritField: '灵田',
                            spiritMine: '灵矿',
                            market: '坊市',
                            alchemyFurnace: '丹炉',
                            forge: '锻器坊',
                            scriptureHall: '藏经阁',
                            recruitmentPavilion: '聚仙台',
                          }
                          return names[b] ?? b
                        })
                        .join('、')}
                    </span>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
        <div className={styles.bottleneckList}>
          {bottlenecks.map((bottleneck) => (
            <div
              key={bottleneck.id}
              className={`${styles.bottleneckCard} ${
                bottleneck.severity === 'high'
                  ? styles.bottleneckHigh
                  : bottleneck.severity === 'medium'
                    ? styles.bottleneckMedium
                    : styles.bottleneckLow
              }`}
            >
              <div className={styles.bottleneckHeader}>
                <span className={styles.bottleneckTitle}>{bottleneck.label}</span>
                <span className={styles.bottleneckSeverity}>
                  {bottleneck.severity === 'high' ? '高压' : bottleneck.severity === 'medium' ? '留意' : '平稳'}
                </span>
              </div>
              <div className={styles.bottleneckDetail}>{bottleneck.detail}</div>
              <div className={styles.bottleneckSuggestion}>{bottleneck.suggestion}</div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>挂机策略</div>
        <div className={styles.policyGrid}>
          {SECT_RISK_POLICY_LIST.map((policy) => {
            const active = sect.strategySettings.activePolicy === policy.id
            return (
              <button
                key={policy.id}
                type="button"
                className={`${styles.policyCard} ${active ? styles.policyCardActive : ''}`}
                onClick={() => handlePolicyChange(policy.id)}
              >
                <span className={styles.policyName}>{policy.name}</span>
                <span className={styles.policyDesc}>{policy.description}</span>
              </button>
            )
          })}
        </div>
        {activeTemplate ? (
          <div className={styles.templateSummary}>
            <div className={styles.templateSummaryHeader}>
              <span className={styles.templateSummaryTitle}>当前启用模板</span>
              <span className={styles.templateSummaryName}>{activeTemplate.name}</span>
            </div>
            <div className={styles.templateMetaRow}>
              <span>{getRewardFocusLabel(activeTemplate.rewardFocus)}</span>
              <span>{getTeamRuleLabel(activeTemplate.teamRule)}</span>
              <span>{getFallbackRuleLabel(activeTemplate.fallbackOnFailure)}</span>
            </div>
            <div className={styles.templateNotes}>{activeTemplate.notes}</div>
            {activeTemplateSignal ? <div className={styles.templateNotes}>{activeTemplateSignal.detail}</div> : null}
            {latestTemplateAdjustment ? (
              <div className={`${styles.templateNotes} ${styles.templateAdjustmentMeta}`}>
                {latestTemplateAdjustment.message}
              </div>
            ) : null}
            {activeTemplateLoopYield ? (
              <div className={`${styles.templateNotes} ${styles.loopYieldMeta}`}>
                最近一轮归墟回响带回 潮晶 {activeTemplateLoopYield.tideCrystalCount}、残片{' '}
                {activeTemplateLoopYield.abyssShardCount}，已推进至第 {activeTemplateLoopYield.floorsCleared} 层。
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>下一轮预期</div>
        <div className={styles.forecastGrid}>
          <div className={styles.forecastCard}>
            <span className={styles.forecastLabel}>下一轮周期</span>
            <strong className={styles.forecastValue}>{Math.max(1, nextAutoRunInDays)} 个游戏日</strong>
            <span className={styles.forecastMeta}>继续当前配置后，宗门的基础增量如下</span>
          </div>
          <div className={styles.forecastCard}>
            <span className={styles.forecastLabel}>预估资源</span>
            <strong className={styles.forecastValue}>+{nextCyclePreview.spiritStone.toLocaleString()} 灵石</strong>
            <span className={styles.forecastMeta}>
              灵气 +{nextCyclePreview.spiritEnergy.toLocaleString()} · 灵草 +{nextCyclePreview.herb.toLocaleString()} ·
              矿材 +{nextCyclePreview.ore.toLocaleString()}
            </span>
          </div>
        </div>
      </section>

      <div className={styles.midgroundGrid} data-testid="sect-midground-grid">
        <section className={styles.section}>
          <div className={styles.sectionTitle}>资源</div>
          <div className={styles.resourceGrid}>
            <div className={styles.resourceCard}>
              <PixelIcon name="spiritStone" size={18} className={styles.inlineIcon} aria-label="灵石" />
              <span className={styles.resourceLabel}>灵石</span>
              <span className={styles.resourceValue}>{Math.floor(sect.resources.spiritStone).toLocaleString()}</span>
              {spiritStoneRatio > 0.5 && (
                <div className={styles.capBar}>
                  <div
                    className={`${styles.capBarFill} ${spiritStoneRatio > 0.8 ? styles.capBarWarning : ''}`}
                    style={{ width: `${Math.min(100, spiritStoneRatio * 100)}%` }}
                  />
                  <span className={styles.capBarLabel}>
                    {Math.floor(sect.resources.spiritStone).toLocaleString()} / {spiritStoneCap.toLocaleString()}
                  </span>
                </div>
              )}
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

      <div className={styles.synergySummary}>
        <PixelIcon name="buildingMainHall" size={14} className={styles.inlineIcon} aria-label="协同" />
        <span>
          建筑协同已激活 {activeSynergyCount}/{UNIQUE_SYNERGY_TOTAL}
        </span>
      </div>

      {notableDisciples.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionTitle}>命格弟子</div>
          <div className={styles.fateGridList}>
            {notableDisciples.map((char) => {
              const fateDef = getFateGridDef(char.fateGrid!)
              return (
                <div key={char.id} className={styles.fateGridItem}>
                  <span className={styles.fateGridName}>{char.name}</span>
                  <span className={styles.fateGridRarity}>
                    {fateDef.name} · {FATE_GRID_RARITY_NAMES[fateDef.rarity]}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <StrategyPanel />

      <div className={styles.backgroundStack}>
        <SectPathPanel />
        <details className={styles.collapsibleSection}>
          <summary className={styles.collapsibleSummary}>
            <span>飞升与传承</span>
            <span className={styles.collapsibleMeta}>展开详情</span>
          </summary>
          <LegacyPanel />
        </details>
        <details className={styles.collapsibleSection}>
          <summary className={styles.collapsibleSummary}>
            <span>宗门统计</span>
            <span className={styles.collapsibleMeta}>展开详情</span>
          </summary>
          <StatsPanel />
        </details>
      </div>
    </div>
  )
}
