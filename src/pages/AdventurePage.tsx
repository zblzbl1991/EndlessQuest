import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdventureStore, isDungeonUnlocked } from '../stores/adventureStore'
import { useSectStore } from '../stores/sectStore'
import { useGameStore } from '../stores/gameStore'
import { useEventLogStore } from '../stores/eventLogStore'
import { getRealmName } from '../data/realms'
import { getLegacyDungeonName } from '../data/legacyUnlocks'
import { getRunIntentDef } from '../data/runIntents'
import { REPORT_RESULT_LABELS } from '../data/uiCopy'
import type { CharacterQuality } from '../types/character'
import {
  getExpeditionTemplateSignal,
  getFallbackRuleLabel,
  getRewardFocusLabel,
  getRiskTierLabel,
  getSpecialExpeditionTemplateCount,
  getTeamRuleLabel,
  getVisibleExpeditionTemplates,
  isHighRiskTemplate,
} from '../data/expeditionTemplates'
import { getConfidenceStatus } from '../systems/adventure/TemplateConfidenceSystem'
import { getArchetypeFitLabel, getRiskDescription } from '../systems/adventure/RiskRewardSystem'
import { getArchetypeDescriptor } from '../data/sectArchetypes'
import { getLegacyTemplateCapacity } from '../data/legacy'
import { analyzeGuixuLoop, summarizeGuixuLoopYield } from '../systems/sect/GuixuLoopAdvisor'

import type { AutomationStrategy, TacticalPreset } from '../types/adventure'
import PageHeader from '../components/common/PageHeader'
import { PixelIcon } from '../components/common/PixelIcon'

import TacticPresetPicker from '../components/adventure/TacticPresetPicker'
import styles from './AdventurePage.module.css'

const RUN_INTENT_IDS: AutomationStrategy[] = ['steady', 'combat', 'profit']

function getDungeonIconName(dungeonId: string): string {
  switch (dungeonId) {
    case 'lingCaoValley':
      return 'dungeonValley'
    case 'biQuanStream':
      return 'dungeonCave'
    case 'luoYunCave':
      return 'dungeonCave'
    case 'anYaForest':
      return 'dungeonWasteland'
    case 'bloodDemonAbyss':
      return 'dungeonAbyss'
    case 'hanBingCave':
      return 'dungeonCave'
    case 'dragonBoneWasteland':
      return 'dungeonWasteland'
    case 'shiHunSwamp':
      return 'dungeonAbyss'
    case 'nineNetherPurgatory':
      return 'dungeonPurgatory'
    case 'wanYaoPalace':
      return 'dungeonTribulation'
    case 'heavenlyTribulationRealm':
      return 'dungeonTribulation'
    case 'guixuRift':
      return 'dungeonAbyss'
    default:
      return 'dungeonCave'
  }
}

export default function AdventurePage() {
  const [buildingTeam, setBuildingTeam] = useState<string | null>(null)
  const dungeons = useAdventureStore((s) => s.dungeons)
  const reports = useAdventureStore((s) => s.reports)
  const completedDungeons = useAdventureStore((s) => s.completedDungeons)
  const reportDetails = useAdventureStore((s) => s.reportDetails)
  const sect = useSectStore((s) => s.sect)
  const setAutomationSettings = useSectStore((s) => s.setAutomationSettings)
  const runAutomation = useAdventureStore((s) => s.runAutomation)
  const dayProgressSec = useGameStore((s) => s.dayProgressSec)
  const recentEvents = useEventLogStore((s) => s.events)

  const maxRealmChar = useMemo(() => {
    if (sect.characters.length === 0) return null
    return sect.characters.reduce((best, char) =>
      char.realm > best.realm || (char.realm === best.realm && char.realmStage > best.realmStage) ? char : best
    )
  }, [sect.characters])

  const availableCharacters = useMemo(() => sect.characters.filter((char) => char.status === 'idle'), [sect.characters])
  const playerRealm = maxRealmChar?.realm ?? 0
  const playerStage = maxRealmChar?.realmStage ?? 0
  const nextDayCountdown = Math.max(0, 60 - dayProgressSec)
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
  const latestGuixuLoopYield = (() => {
    if (activeTemplate?.id !== 'guixuResonance') return null

    const latestGuixuSummary = reports.find((report) => report.dungeonId === 'guixuRift')
    if (!latestGuixuSummary) return null

    return summarizeGuixuLoopYield(reportDetails[latestGuixuSummary.id])
  })()
  const guixuLoopAnalysis = analyzeGuixuLoop(activeTemplate, sect.archiveMilestones, latestGuixuLoopYield)
  const activeTemplateLoopPreview = guixuLoopAnalysis.preview
  const activeLoopYieldStatus = guixuLoopAnalysis.status
  const preferredDungeon =
    dungeons.find((item) => item.id === (activeTemplate?.dungeonId ?? sect.automationSettings.preferredDungeonId)) ??
    null
  const unlockedDungeons = dungeons.filter((dungeon) =>
    isDungeonUnlocked(dungeon, playerRealm, playerStage, sect.legacy.unlockedDungeons)
  )
  const preferredDungeonUnlocked = preferredDungeon
    ? isDungeonUnlocked(preferredDungeon, playerRealm, playerStage, sect.legacy.unlockedDungeons)
    : false
  const effectivePreferredDungeon = preferredDungeonUnlocked ? preferredDungeon : null
  const characterNameMap = useMemo(
    () => new Map(sect.characters.map((char) => [char.id, char.name])),
    [sect.characters]
  )
  const latestReport = reports[0] ?? null
  const quickLaunchDungeonId = effectivePreferredDungeon?.id ?? unlockedDungeons[0]?.id ?? null

  const updateActiveTemplate = <K extends keyof NonNullable<typeof activeTemplate>>(
    key: K,
    value: NonNullable<typeof activeTemplate>[K]
  ) => {
    if (!activeTemplate) return
    setAutomationSettings({
      preferredDungeonId: key === 'dungeonId' ? (value as string | null) : sect.automationSettings.preferredDungeonId,
      casualtyTolerance:
        key === 'riskTolerance'
          ? (value as typeof sect.automationSettings.casualtyTolerance)
          : sect.automationSettings.casualtyTolerance,
      expeditionTemplates: sect.automationSettings.expeditionTemplates.map((template) =>
        template.id === activeTemplate.id ? { ...template, [key]: value } : template
      ),
    })
  }

  const applyTemplateTweaks = (
    changes: Partial<
      Pick<NonNullable<typeof activeTemplate>, 'riskTolerance' | 'supplyLevel' | 'rewardFocus' | 'fallbackOnFailure'>
    >
  ) => {
    if (!activeTemplate) return
    setAutomationSettings({
      preferredDungeonId: sect.automationSettings.preferredDungeonId,
      casualtyTolerance:
        (changes.riskTolerance as typeof sect.automationSettings.casualtyTolerance | undefined) ??
        sect.automationSettings.casualtyTolerance,
      expeditionTemplates: sect.automationSettings.expeditionTemplates.map((template) =>
        template.id === activeTemplate.id ? { ...template, ...changes } : template
      ),
    })
  }

  const loopAdjustmentSuggestions = guixuLoopAnalysis.suggestions
  const activeTemplateId = activeTemplate?.id
  const latestTemplateAdjustment =
    recentEvents.find((event) => event.type === 'automation_adjusted' && event.data?.templateId === activeTemplateId) ??
    null

  const handleQuickLaunch = () => {
    if (!quickLaunchDungeonId) return
    const autoTeam = [...availableCharacters]
      .sort((a, b) => b.realm * 4 + b.realmStage - (a.realm * 4 + a.realmStage))
      .slice(0, 5)
      .map((c) => c.id)
    if (autoTeam.length === 0) return
    runAutomation({
      dungeonId: quickLaunchDungeonId,
      teamCharacterIds: autoTeam,
      supplyLevel: activeTemplate?.supplyLevel ?? 'basic',
      tacticalPreset:
        activeTemplate?.riskTolerance === 'risky'
          ? 'burst'
          : activeTemplate?.riskTolerance === 'conservative'
            ? 'conservative'
            : 'balanced',
      automationStrategy:
        activeTemplate?.rewardFocus === 'progress'
          ? 'combat'
          : activeTemplate?.rewardFocus === 'techniques' || activeTemplate?.rewardFocus === 'pets'
            ? 'profit'
            : 'steady',
    })
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="秘境"
        testId="adventure-hero"
        action={
          <div className={styles.launchActions}>
            <button
              type="button"
              className={`${styles.quickLaunchBtn} ${!quickLaunchDungeonId || availableCharacters.length === 0 ? styles.btnDisabled : ''}`}
              disabled={!quickLaunchDungeonId || availableCharacters.length === 0}
              onClick={handleQuickLaunch}
            >
              一键出发
            </button>
            <button
              type="button"
              className={styles.customLaunchLink}
              onClick={() => quickLaunchDungeonId && setBuildingTeam(quickLaunchDungeonId)}
            >
              自定义
            </button>
          </div>
        }
        metrics={[
          {
            label: '启用模板',
            value: activeTemplate?.name ?? '未设置',
            detail: preferredDungeon?.name ?? '未设置目标秘境',
          },
          {
            label: '可出战',
            value: availableCharacters.length,
            detail:
              availableCharacters.length > 0
                ? sect.characters
                    .filter((char) => char.status === 'recovering')
                    .map((char) => `${char.name}（${char.recoveryDaysRemaining ?? '?'}天）`)
                    .join('、') || '无恢复中弟子'
                : '全部弟子忙于其他事务',
          },
          {
            label: '最近结果',
            value: latestReport ? REPORT_RESULT_LABELS[latestReport.result] : '暂无',
            detail: latestReport ? `推进至第 ${latestReport.floorsCleared} 层` : '尚未留下战报',
          },
          {
            label: '下一次结算',
            value: `${Math.ceil(nextDayCountdown)} 秒`,
            detail: `已留名秘境 ${completedDungeons.length}`,
          },
        ]}
      />

      <section className={styles.automationPanel}>
        <div className={styles.automationHeader}>
          <div>
            <h2 className={styles.panelTitle}>自动运转</h2>
            <p className={styles.panelMeta}>
              {activeTemplate
                ? `当前按模板「${activeTemplate.name}」运转，每 5 个游戏日自动尝试一次。`
                : '先选一套远征模板，再交给宗门自行推进。'}
            </p>
          </div>
        </div>

        <div className={styles.templateRail}>
          {visibleTemplates.map((template) => {
            const isActive = template.id === sect.automationSettings.activeTemplateId
            const templateSignal = getExpeditionTemplateSignal(template.id, sect.archiveMilestones)
            return (
              <button
                key={template.id}
                type="button"
                className={`${styles.templateChip} ${isActive ? styles.templateChipActive : ''}`}
                onClick={() => setAutomationSettings({ activeTemplateId: template.id })}
              >
                <span className={styles.templateChipTop}>
                  <span className={styles.templateChipName}>{template.name}</span>
                  {templateSignal ? <span className={styles.templateSignalBadge}>{templateSignal.label}</span> : null}
                </span>
                <span className={styles.templateChipMeta}>
                  {getRewardFocusLabel(template.rewardFocus)}
                  {' · '}
                  {getRiskTierLabel(template.riskTier)}
                  {templateSignal ? ` 路 ${templateSignal.detail}` : ''}
                </span>
              </button>
            )
          })}
        </div>

        <div className={styles.templateCapacityHint}>
          当前轮回已开放 {templateCapacity} 个远征模板位
          {specialTemplateCount > 0 ? `，另有 ${specialTemplateCount} 个共鸣解锁模板` : ''}
          ，继续飞升可解锁更多长期预案。
        </div>

        {activeTemplate ? (
          <div className={styles.templateEditor}>
            <div className={styles.templateHeader}>
              <div>
                <div className={styles.templateTitle}>{activeTemplate.name}</div>
                <div className={styles.templateHint}>{activeTemplate.notes}</div>
                {activeTemplateSignal ? (
                  <div className={styles.templateSignalHint}>{activeTemplateSignal.detail}</div>
                ) : null}
              </div>
              <label className={styles.templateToggle}>
                <input
                  type="checkbox"
                  checked={activeTemplate.enabled}
                  onChange={(event) => updateActiveTemplate('enabled', event.target.checked)}
                />
                <span>{activeTemplate.enabled ? '启用中' : '已停用'}</span>
              </label>
            </div>

            <div className={styles.settingGrid}>
              <label className={styles.settingField}>
                <span className={styles.settingLabel}>目标秘境</span>
                <select
                  className={styles.settingSelect}
                  value={activeTemplate.dungeonId ?? ''}
                  onChange={(event) =>
                    updateActiveTemplate('dungeonId', event.target.value === '' ? null : event.target.value)
                  }
                >
                  <option value="">未设置</option>
                  {dungeons.map((dungeon) => {
                    const unlocked = isDungeonUnlocked(dungeon, playerRealm, playerStage, sect.legacy.unlockedDungeons)
                    return (
                      <option key={dungeon.id} value={dungeon.id} disabled={!unlocked}>
                        {unlocked ? dungeon.name : `${dungeon.name}（未解锁）`}
                      </option>
                    )
                  })}
                </select>
              </label>

              <label className={styles.settingField}>
                <span className={styles.settingLabel}>伤亡倾向</span>
                <select
                  className={styles.settingSelect}
                  value={activeTemplate.riskTolerance}
                  onChange={(event) =>
                    updateActiveTemplate('riskTolerance', event.target.value as typeof activeTemplate.riskTolerance)
                  }
                >
                  <option value="conservative">保守</option>
                  <option value="balanced">均衡</option>
                  <option value="risky">赌命</option>
                </select>
              </label>

              <label className={styles.settingField}>
                <span className={styles.settingLabel}>收益偏好</span>
                <select
                  className={styles.settingSelect}
                  value={activeTemplate.rewardFocus}
                  onChange={(event) =>
                    updateActiveTemplate('rewardFocus', event.target.value as typeof activeTemplate.rewardFocus)
                  }
                >
                  <option value="resources">资源</option>
                  <option value="materials">材料</option>
                  <option value="techniques">功法</option>
                  <option value="pets">灵宠</option>
                  <option value="progress">推进</option>
                </select>
              </label>

              <label className={styles.settingField}>
                <span className={styles.settingLabel}>补给等级</span>
                <select
                  className={styles.settingSelect}
                  value={activeTemplate.supplyLevel}
                  onChange={(event) =>
                    updateActiveTemplate('supplyLevel', event.target.value as typeof activeTemplate.supplyLevel)
                  }
                >
                  <option value="basic">基础</option>
                  <option value="enhanced">充足</option>
                  <option value="luxury">豪华</option>
                </select>
              </label>

              <label className={styles.settingField}>
                <span className={styles.settingLabel}>出战规则</span>
                <select
                  className={styles.settingSelect}
                  value={activeTemplate.teamRule}
                  onChange={(event) =>
                    updateActiveTemplate('teamRule', event.target.value as typeof activeTemplate.teamRule)
                  }
                >
                  <option value="balanced">均衡阵</option>
                  <option value="topPower">最强阵</option>
                  <option value="reserveCore">留核心</option>
                </select>
              </label>

              <label className={styles.settingField}>
                <span className={styles.settingLabel}>失利后处理</span>
                <select
                  className={styles.settingSelect}
                  value={activeTemplate.fallbackOnFailure}
                  onChange={(event) =>
                    updateActiveTemplate(
                      'fallbackOnFailure',
                      event.target.value as typeof activeTemplate.fallbackOnFailure
                    )
                  }
                >
                  <option value="downgrade_dungeon">自动降档</option>
                  <option value="swap_team">换队再试</option>
                  <option value="pause_template">暂停模板</option>
                </select>
              </label>
            </div>

            <div className={styles.templateSummaryBar}>
              <span>{getRewardFocusLabel(activeTemplate.rewardFocus)}</span>
              <span>{getTeamRuleLabel(activeTemplate.teamRule)}</span>
              <span>{getFallbackRuleLabel(activeTemplate.fallbackOnFailure)}</span>
            </div>

            {/* Risk tier info */}
            {activeTemplate?.riskTier && activeTemplate.riskHookDescriptor ? (
              <div className={styles.riskInfoCard}>
                <div className={styles.riskInfoHeader}>
                  <span className={styles.riskInfoTitle}>{getRiskTierLabel(activeTemplate.riskTier)}</span>
                  <span className={`${styles.riskBadge} ${styles[`riskBadge_${activeTemplate.riskTier}`] ?? ''}`}>
                    {activeTemplate.riskHookDescriptor.title}
                  </span>
                </div>
                <div className={styles.riskInfoDesc}>{getRiskDescription(activeTemplate.riskTier)}</div>
                {isHighRiskTemplate(activeTemplate.id) ? (
                  <div className={styles.riskExclusiveSection}>
                    <div className={styles.riskSectionLabel}>独占奖励</div>
                    <div className={styles.riskTagList}>
                      {activeTemplate.riskHookDescriptor.exclusiveRewards.map((reward) => (
                        <span key={reward} className={styles.riskTag}>
                          {reward}
                        </span>
                      ))}
                    </div>
                    <div className={styles.riskSectionLabel} style={{ marginTop: 8 }}>
                      可能的惩罚
                    </div>
                    <div className={styles.riskTagList}>
                      {activeTemplate.riskHookDescriptor.likelyPenalty.map((penalty) => (
                        <span key={penalty} className={styles.riskTagPenalty}>
                          {penalty}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {/* Archetype fit */}
                {(() => {
                  const fitResult = getArchetypeFitLabel(sect.currentArchetype, activeTemplate.riskHookDescriptor)
                  return (
                    <div
                      className={`${styles.riskFitRow} ${fitResult.fit === 'good' ? styles.riskFitGood : fitResult.fit === 'poor' ? styles.riskFitPoor : ''}`}
                    >
                      <span>{fitResult.label}</span>
                      <span className={styles.riskFitArchetype}>
                        {getArchetypeDescriptor(sect.currentArchetype).name}
                      </span>
                    </div>
                  )
                })()}
              </div>
            ) : null}

            {/* Template confidence */}
            {(() => {
              const confidenceEntries = sect.automationSettings.templateConfidence ?? []
              const entry = confidenceEntries.find((e) => e.templateId === activeTemplate?.id)
              const confidence = getConfidenceStatus(entry)
              return (
                <div className={styles.confidenceCard}>
                  <div className={styles.confidenceHeader}>
                    <span className={styles.confidenceLabel}>模板可信度</span>
                    <span className={styles.confidenceValue}>{entry?.score ?? 50}</span>
                    <span className={`${styles.confidenceStatus} ${styles[`conf_${confidence.status}`] ?? ''}`}>
                      {confidence.statusLabel}
                    </span>
                  </div>
                  <div className={styles.confidenceDetail}>{confidence.statusDetail}</div>
                </div>
              )
            })()}

            {activeTemplateLoopPreview ? (
              <div className={styles.loopPreviewCard} data-testid="guixu-loop-preview">
                {latestTemplateAdjustment ? (
                  <div className={styles.adjustmentBanner} data-testid="guixu-adjustment-banner">
                    {latestTemplateAdjustment.message}
                  </div>
                ) : null}
                <div className={styles.loopPreviewHeader}>
                  <span className={styles.loopPreviewTitle}>{activeTemplateLoopPreview.title}</span>
                  <span className={styles.loopPreviewYield}>{activeTemplateLoopPreview.yieldSummary}</span>
                </div>
                <div className={styles.loopPreviewDetail}>{activeTemplateLoopPreview.detail}</div>
                <div className={styles.loopPreviewRecommendation}>{activeTemplateLoopPreview.recommendation}</div>
                {latestGuixuLoopYield ? (
                  <div className={styles.loopRealityCard} data-testid="guixu-loop-reality">
                    <div className={styles.loopRealityHeader}>
                      <span className={styles.loopRealityTitle}>最近实收</span>
                      {activeLoopYieldStatus ? (
                        <span
                          className={`${styles.loopRealityBadge} ${
                            activeLoopYieldStatus.tone === 'good'
                              ? styles.loopRealityGood
                              : activeLoopYieldStatus.tone === 'warn'
                                ? styles.loopRealityWarn
                                : styles.loopRealityBalanced
                          }`}
                        >
                          {activeLoopYieldStatus.label}
                        </span>
                      ) : null}
                    </div>
                    <div className={styles.loopRealityStats}>
                      潮晶 {latestGuixuLoopYield.tideCrystalCount} · 残片 {latestGuixuLoopYield.abyssShardCount} ·
                      推进至第 {latestGuixuLoopYield.floorsCleared} 层
                    </div>
                    {activeLoopYieldStatus ? (
                      <div className={styles.loopRealityDetail}>{activeLoopYieldStatus.detail}</div>
                    ) : null}
                  </div>
                ) : null}
                {loopAdjustmentSuggestions.length > 0 ? (
                  <div className={styles.loopAdviceCard} data-testid="guixu-loop-advice">
                    <div className={styles.loopAdviceTitle}>建议调参</div>
                    <div className={styles.loopAdviceList}>
                      {loopAdjustmentSuggestions.map((suggestion) => (
                        <div key={suggestion.id} className={styles.loopAdviceItem}>
                          <div className={styles.loopAdviceText}>
                            <strong>{suggestion.label}</strong>
                            <span>{suggestion.detail}</span>
                          </div>
                          {suggestion.changes ? (
                            <button
                              type="button"
                              className={styles.loopAdviceButton}
                              onClick={() => applyTemplateTweaks(suggestion.changes!)}
                            >
                              一键套用
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {buildingTeam && (
        <TeamBuilder
          dungeonId={buildingTeam}
          availableCharacters={availableCharacters}
          onClose={() => setBuildingTeam(null)}
        />
      )}

      <div className={styles.contentLayout}>
        <section className={styles.section}>
          <details open={reports.length > 0} className={styles.reportSection}>
            <summary className={styles.sectionTitle}>
              最近探索记录
              <span className={styles.reportCount}>{reports.length > 0 ? `(${reports.length})` : ''}</span>
            </summary>
            {reports.length === 0 ? (
              <div className={styles.empty}>还没有探索战报。</div>
            ) : (
              <div className={styles.reportList}>
                {reports.map((report) => {
                  const dungeon = dungeons.find((item) => item.id === report.dungeonId)
                  const detail = reportDetails[report.id]
                  const teamNames = report.teamCharacterIds
                    .map((id) => detail?.teamSnapshot?.[id]?.name ?? characterNameMap.get(id) ?? id)
                    .join('、')
                  const rewardBits = [
                    report.rewards.spiritStone > 0 ? `${report.rewards.spiritStone}灵石` : null,
                    report.rewards.herb > 0 ? `${report.rewards.herb}灵草` : null,
                    report.rewards.ore > 0 ? `${report.rewards.ore}矿材` : null,
                    report.itemRewardCount > 0 ? `${report.itemRewardCount}物品` : null,
                  ].filter(Boolean)

                  return (
                    <article key={report.id} className={styles.reportCard}>
                      <div className={styles.reportCompactRow}>
                        <span className={styles.reportName}>
                          <PixelIcon
                            name={getDungeonIconName(report.dungeonId)}
                            size={16}
                            className={styles.inlineIcon}
                            aria-label={dungeon?.name ?? report.dungeonId}
                          />
                          {dungeon?.name ?? report.dungeonId}
                        </span>
                        <span className={`${styles.reportBadge} ${styles[`result${report.result}`] ?? ''}`}>
                          {REPORT_RESULT_LABELS[report.result]}
                        </span>
                        {report.riskTier && isHighRiskTemplate(report.templateId ?? '') ? (
                          <span className={`${styles.reportBadge} ${styles.riskBadgeHighlight}`}>
                            {getRiskTierLabel(report.riskTier)}
                          </span>
                        ) : null}
                      </div>
                      <div className={styles.reportCompactInfo}>
                        <span>{teamNames}</span>
                        <span>第{report.floorsCleared}层</span>
                        <span>{rewardBits.length > 0 ? rewardBits.join(' ') : '暂无'}</span>
                      </div>
                      <Link className={styles.detailLink} to={`/adventure/report/${report.id}`}>
                        查看详情
                      </Link>
                    </article>
                  )
                })}
              </div>
            )}
          </details>
        </section>

        <aside className={styles.sideColumn}>
          <section className={styles.section}>
            <div className={styles.sectionTitle}>手动发起</div>
            <div className={styles.launchPanel}>
              <div className={styles.launchSummary}>
                <span className={styles.launchLabel}>当前候选</span>
                <span className={styles.launchValue}>
                  {preferredDungeon?.name ?? unlockedDungeons[0]?.name ?? '暂无可用秘境'}
                </span>
              </div>
              <button
                className={`${styles.startBtn} ${!quickLaunchDungeonId ? styles.btnDisabled : ''}`}
                disabled={!quickLaunchDungeonId}
                onClick={() => quickLaunchDungeonId && setBuildingTeam(quickLaunchDungeonId)}
              >
                组队出发
              </button>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionTitle}>可选秘境</div>
            <div className={styles.dungeonList}>
              {dungeons.map((dungeon) => {
                const unlocked = isDungeonUnlocked(dungeon, playerRealm, playerStage, sect.legacy.unlockedDungeons)
                const unlockRealmName = getRealmName(dungeon.unlockRealm, dungeon.unlockStage as 0 | 1 | 2 | 3)
                const cleared = completedDungeons.includes(dungeon.id)
                const launchDisabled = !unlocked || availableCharacters.length === 0
                const legacyHint = dungeon.legacyUnlockId
                  ? `闇€${unlockRealmName}涓斿畬鎴?${getLegacyDungeonName(dungeon.legacyUnlockId)}鐨勮疆鍥炶В閿佹墠鑳借繘鍏?`
                  : null
                let hint = ''
                if (!unlocked) {
                  hint = `需${unlockRealmName}才可探索`
                } else if (availableCharacters.length === 0) {
                  hint = '暂无空闲弟子可出战'
                } else if (cleared) {
                  hint = '已通关，可再次挑战'
                } else {
                  hint = '手动发起并保留完整战报。'
                }

                return (
                  <div key={dungeon.id} className={`${styles.dungeonCard} ${!unlocked ? styles.dungeonLocked : ''}`}>
                    <div className={styles.dungeonHeader}>
                      <span className={styles.dungeonName}>
                        <PixelIcon
                          name={getDungeonIconName(dungeon.id)}
                          size={18}
                          className={styles.inlineIcon}
                          aria-label={dungeon.name}
                        />
                        {dungeon.name}
                      </span>
                      <span className={styles.lockBadge}>
                        {unlocked ? (cleared ? '已留名' : '可探索') : `${unlockRealmName} 解锁`}
                      </span>
                    </div>
                    <div className={styles.dungeonInfo}>
                      <span>层数：{dungeon.totalLayers}</span>
                      <span>推荐：{unlockRealmName}</span>
                    </div>
                    {dungeon.legacyUnlockId ? <div className={styles.legacyBadge}>杞洖闅愪笘绉樺</div> : null}
                    {!unlocked && legacyHint ? <div className={styles.dungeonHint}>{legacyHint}</div> : null}
                    <div className={styles.dungeonHint}>{hint}</div>
                    <button
                      className={`${styles.startBtn} ${launchDisabled ? styles.btnDisabled : ''}`}
                      disabled={launchDisabled}
                      onClick={() => setBuildingTeam(dungeon.id)}
                    >
                      手动发起
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

function TeamBuilder({
  dungeonId,
  availableCharacters,
  onClose,
}: {
  dungeonId: string
  availableCharacters: {
    id: string
    name: string
    quality: CharacterQuality
    realm: number
    realmStage: 0 | 1 | 2 | 3
    baseStats: { hp: number; atk: number; def: number; spd: number }
  }[]
  onClose: () => void
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [preset, setPreset] = useState<TacticalPreset>('balanced')
  const [strategy, setStrategy] = useState<AutomationStrategy>('steady')
  const runAutomation = useAdventureStore((s) => s.runAutomation)
  const dungeon = useAdventureStore((s) => s.dungeons.find((item) => item.id === dungeonId))

  const toggleCharacter = (charId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(charId)) return prev.filter((id) => id !== charId)
      if (prev.length >= 5) return prev
      return [...prev, charId]
    })
  }

  const handleConfirm = () => {
    if (selectedIds.length === 0) return
    const report = runAutomation({
      dungeonId,
      teamCharacterIds: selectedIds,
      supplyLevel: 'basic',
      tacticalPreset: preset,
      automationStrategy: strategy,
    })

    if (report) onClose()
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.teamBuilder}>
        <div className={styles.teamBuilderHeader}>
          <span className={styles.teamBuilderTitle}>手动发起</span>
          <span className={styles.dungeonTarget}>{dungeon?.name ?? dungeonId}</span>
        </div>

        <div className={styles.teamBuilderSection}>
          <div className={styles.sectionLabel}>目标秘境</div>
          <div className={styles.targetCard}>
            <span className={styles.targetName}>{dungeon?.name ?? dungeonId}</span>
            <span className={styles.targetMeta}>即时结算并生成完整战报。</span>
          </div>
        </div>

        <div className={styles.teamBuilderSection}>
          <div className={styles.sectionLabel}>本局意图</div>
          <div className={styles.strategyOptions}>
            {RUN_INTENT_IDS.map((option) => (
              <button
                key={option}
                type="button"
                className={`${styles.strategyOption} ${strategy === option ? styles.strategyOptionActive : ''}`}
                onClick={() => setStrategy(option)}
              >
                <span className={styles.strategyName}>{getRunIntentDef(option).label}</span>
                <span className={styles.strategyDesc}>{getRunIntentDef(option).shortDescription}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.teamBuilderSection}>
          <TacticPresetPicker value={preset} onChange={setPreset} title="战术" />
        </div>

        <div className={styles.teamBuilderSection}>
          <div className={styles.sectionLabel}>出战弟子</div>
          <div className={styles.teamCharList}>
            {availableCharacters.map((char) => {
              const selected = selectedIds.includes(char.id)
              return (
                <button
                  key={char.id}
                  type="button"
                  className={`${styles.teamCharItem} ${selected ? styles.teamCharSelected : ''}`}
                  onClick={() => toggleCharacter(char.id)}
                >
                  <span className={styles.teamCharCheck}>{selected ? '√' : ''}</span>
                  <span className={styles.teamCharInfo}>
                    <span className={styles.teamCharName}>{char.name}</span>
                    <span className={styles.teamCharRealm}>{getRealmName(char.realm, char.realmStage)}</span>
                  </span>
                </button>
              )
            })}
          </div>
          <div className={styles.teamBuilderHint}>已选 {selectedIds.length} / 5</div>
        </div>

        <div className={styles.teamActions}>
          <button className={styles.cancelBtn} onClick={onClose}>
            取消
          </button>
          <button
            className={`${styles.confirmBtn} ${selectedIds.length === 0 ? styles.btnDisabled : ''}`}
            disabled={selectedIds.length === 0}
            onClick={handleConfirm}
          >
            确认出发
          </button>
        </div>
      </div>
    </div>
  )
}
