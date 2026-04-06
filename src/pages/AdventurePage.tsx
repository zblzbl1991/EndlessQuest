import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdventureStore, isDungeonUnlocked } from '../stores/adventureStore'
import { useSectStore } from '../stores/sectStore'
import { useGameStore } from '../stores/gameStore'
import { getRealmName } from '../data/realms'
import { getRunIntentDef } from '../data/runIntents'
import { REPORT_RESULT_LABELS, getTacticalPresetLabel } from '../data/uiCopy'
import { buildAdventureReportInsight } from '../systems/roguelike/AdventureReportInsightSystem'
import type { CharacterQuality } from '../types/character'
import type { AdventureReport } from '../types'
import type { AutomationStrategy, TacticalPreset } from '../types/adventure'
import PageHeader from '../components/common/PageHeader'
import { PixelIcon } from '../components/common/PixelIcon'
import RunBuildSummary from '../components/adventure/RunBuildSummary'
import TacticPresetPicker from '../components/adventure/TacticPresetPicker'
import styles from './AdventurePage.module.css'

const RUN_INTENT_IDS: AutomationStrategy[] = ['steady', 'combat', 'profit']

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

function extractRouteDirections(detail: AdventureReport | undefined): string[] {
  if (!detail) return []

  const labels: string[] = []
  for (const step of detail.steps) {
    if (step.type !== 'route_selected' && step.type !== 'route_considered') continue
    const text = `${step.summary} ${step.detail}`.toLowerCase()
    if (text.includes('稳') || text.includes('stable route') || text.includes('stable')) labels.push('stable')
    if (text.includes('战斗') || text.includes('combat route') || text.includes('combat')) labels.push('combat')
    if (text.includes('收益') || text.includes('profit route') || text.includes('profit')) labels.push('profit')
    if (text.includes('异变') || text.includes('mutation route') || text.includes('mutation')) labels.push('mutation')
  }

  return [...new Set(labels)]
}

export default function AdventurePage() {
  const [buildingTeam, setBuildingTeam] = useState<string | null>(null)
  const dungeons = useAdventureStore((s) => s.dungeons)
  const reports = useAdventureStore((s) => s.reports)
  const completedDungeons = useAdventureStore((s) => s.completedDungeons)
  const reportDetails = useAdventureStore((s) => s.reportDetails)
  const sect = useSectStore((s) => s.sect)
  const setAutomationSettings = useSectStore((s) => s.setAutomationSettings)
  const dayProgressSec = useGameStore((s) => s.dayProgressSec)

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
  const preferredDungeon = dungeons.find((item) => item.id === sect.automationSettings.preferredDungeonId) ?? null
  const unlockedDungeons = dungeons.filter((dungeon) => isDungeonUnlocked(dungeon, playerRealm, playerStage))
  const characterNameMap = useMemo(
    () => new Map(sect.characters.map((char) => [char.id, char.name])),
    [sect.characters]
  )
  const latestReport = reports[0] ?? null
  const manualLaunchDungeonId = preferredDungeon?.id ?? unlockedDungeons[0]?.id ?? null

  return (
    <div className={styles.page}>
      <PageHeader
        title="秘境"
        testId="adventure-hero"
        action={
          <button
            type="button"
            className={`${styles.startBtn} ${!manualLaunchDungeonId ? styles.btnDisabled : ''}`}
            disabled={!manualLaunchDungeonId}
            onClick={() => manualLaunchDungeonId && setBuildingTeam(manualLaunchDungeonId)}
          >
            手动发起
          </button>
        }
        metrics={[
          {
            label: '优先秘境',
            value: preferredDungeon?.name ?? '未设置',
            detail: '每日结算后自动尝试',
          },
          {
            label: '可出战',
            value: availableCharacters.length,
            detail:
              sect.characters
                .filter((char) => char.status === 'recovering')
                .map((char) => `${char.name}（${char.recoveryDaysRemaining ?? '?'}天）`)
                .join('、') || '无恢复中弟子',
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
            <p className={styles.panelMeta}>{`每日结算后自动尝试 ${preferredDungeon?.name ?? '首个可用秘境'}`}</p>
          </div>
        </div>

        <details className={styles.automationDetails}>
          <summary className={styles.automationSummary}>
            <span>优先目标与风险偏好</span>
            <span className={styles.automationSummaryMeta}>展开设置</span>
          </summary>

          <div className={styles.settingGrid}>
            <label className={styles.settingField}>
              <span className={styles.settingLabel}>优先秘境</span>
              <select
                className={styles.settingSelect}
                value={sect.automationSettings.preferredDungeonId ?? ''}
                onChange={(event) =>
                  setAutomationSettings({ preferredDungeonId: event.target.value === '' ? null : event.target.value })
                }
              >
                <option value="">未设置</option>
                {dungeons.map((dungeon) => {
                  const unlocked = isDungeonUnlocked(dungeon, playerRealm, playerStage)
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
                value={sect.automationSettings.casualtyTolerance}
                onChange={(event) =>
                  setAutomationSettings({
                    casualtyTolerance: event.target.value as typeof sect.automationSettings.casualtyTolerance,
                  })
                }
              >
                <option value="conservative">保守</option>
                <option value="balanced">均衡</option>
                <option value="risky">赌命</option>
              </select>
            </label>
          </div>
        </details>
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
          <div className={styles.sectionTitle}>最近探索记录</div>
          {reports.length === 0 ? (
            <div className={styles.empty}>还没有探索战报。</div>
          ) : (
            <div className={styles.reportList}>
              {reports.map((report) => {
                const dungeon = dungeons.find((item) => item.id === report.dungeonId)
                const detail = reportDetails[report.id]
                const insight = detail ? buildAdventureReportInsight(detail, characterNameMap) : null
                const teamNames = report.teamCharacterIds
                  .map((id) => detail?.teamSnapshot?.[id]?.name ?? characterNameMap.get(id) ?? id)
                  .join('、')
                const rewardBits = [
                  report.rewards.spiritStone > 0 ? `${report.rewards.spiritStone} 灵石` : null,
                  report.rewards.herb > 0 ? `${report.rewards.herb} 灵草` : null,
                  report.rewards.ore > 0 ? `${report.rewards.ore} 矿材` : null,
                  report.itemRewardCount > 0 ? `${report.itemRewardCount} 件物品` : null,
                ].filter(Boolean)

                return (
                  <article key={report.id} className={styles.reportCard}>
                    <div className={styles.reportHeader}>
                      <div className={styles.reportTitleGroup}>
                        <div className={styles.reportName}>
                          <PixelIcon
                            name={getDungeonIconName(report.dungeonId)}
                            size={18}
                            className={styles.inlineIcon}
                            aria-label={dungeon?.name ?? report.dungeonId}
                          />
                          {dungeon?.name ?? report.dungeonId}
                        </div>
                        <div className={styles.reportMeta}>队伍：{teamNames}</div>
                      </div>
                      <div className={styles.reportBadges}>
                        <span className={styles.reportBadge}>{getRunIntentDef(report.strategy).label}</span>
                        <span className={`${styles.reportBadge} ${styles[`result${report.result}`] ?? ''}`}>
                          {REPORT_RESULT_LABELS[report.result]}
                        </span>
                      </div>
                    </div>

                    <div className={styles.reportStats}>
                      <span>战术：{getTacticalPresetLabel(report.tacticalPreset)}</span>
                      <span>推进至第 {report.floorsCleared} 层</span>
                    </div>

                    <div className={styles.reportRewardLine}>
                      <span className={styles.rewardLabel}>所得</span>
                      <span className={styles.rewardValues}>
                        {rewardBits.length > 0 ? rewardBits.join(' · ') : '暂无收获'}
                      </span>
                    </div>

                    <div className={styles.reportRewardLine}>
                      <span className={styles.rewardLabel}>回宗</span>
                      <span className={styles.rewardValues}>{insight?.returnOutcome.summary ?? '暂无记录'}</span>
                    </div>

                    <details className={styles.reportDetails}>
                      <summary className={styles.reportDetailsSummary}>
                        <span>构筑与转折</span>
                        <span className={styles.reportDetailsMeta}>展开细节</span>
                      </summary>

                      <div className={styles.reportDetailsBody}>
                        <div className={styles.reportOutcomeLine}>
                          <span className={styles.rewardLabel}>核心</span>
                          <span className={styles.rewardValues}>{insight?.coreName ?? '暂无'}</span>
                        </div>
                        <div className={styles.reportOutcomeLine}>
                          <span className={styles.rewardLabel}>构筑</span>
                          <span className={styles.rewardValues}>{insight?.keyBuild ?? '暂无'}</span>
                        </div>
                        <div className={styles.reportOutcomeLine}>
                          <span className={styles.rewardLabel}>转折</span>
                          <span className={styles.rewardValues}>
                            {insight?.turningPoint ?? (report.result === 'completed' ? '稳定推进至终局' : '暂无')}
                          </span>
                        </div>

                        <RunBuildSummary
                          tacticalPreset={report.tacticalPreset}
                          blessings={[]}
                          relics={[]}
                          branchTags={[]}
                          routeDirections={extractRouteDirections(detail)}
                        />
                      </div>
                    </details>

                    <Link className={styles.detailLink} to={`/adventure/report/${report.id}`}>
                      查看过程
                    </Link>
                  </article>
                )
              })}
            </div>
          )}
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
                className={`${styles.startBtn} ${!manualLaunchDungeonId ? styles.btnDisabled : ''}`}
                disabled={!manualLaunchDungeonId}
                onClick={() => manualLaunchDungeonId && setBuildingTeam(manualLaunchDungeonId)}
              >
                组队出发
              </button>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionTitle}>可选秘境</div>
            <div className={styles.dungeonList}>
              {dungeons.map((dungeon) => {
                const unlocked = isDungeonUnlocked(dungeon, playerRealm, playerStage)
                const unlockRealmName = getRealmName(dungeon.unlockRealm, dungeon.unlockStage as 0 | 1 | 2 | 3)
                const cleared = completedDungeons.includes(dungeon.id)
                const launchDisabled = !unlocked || availableCharacters.length === 0

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
                    <div className={styles.dungeonHint}>{unlocked ? '手动发起并保留完整战报。' : '当前境界不足。'}</div>
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
