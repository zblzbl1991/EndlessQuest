import { useMemo, useState, useCallback, Fragment } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useAdventureStore } from '../stores/adventureStore'
import { useSectStore } from '../stores/sectStore'
import PageHeader from '../components/common/PageHeader'
import { PixelIcon } from '../components/common/PixelIcon'

import { QUALITY_NAMES } from '../data/items'
import { getRunIntentDef } from '../data/runIntents'
import { REPORT_RESULT_LABELS, getTacticalPresetLabel } from '../data/uiCopy'
import { getRiskTierLabel, isHighRiskTemplate, getTemplateRiskHook } from '../data/expeditionTemplates'
import { getRiskDescription } from '../systems/adventure/RiskRewardSystem'
import { getLegacyReportFlavor } from '../data/legacyFlavor'
import type { CombatAction, CombatResult, CombatUnit } from '../systems/combat/CombatEngine'
import { extractNarrative } from '../systems/combat/CombatNarrativeSystem'
import type { CombatHighlight } from '../systems/combat/CombatNarrativeSystem'
import { buildAdventureReportInsight } from '../systems/roguelike/AdventureReportInsightSystem'
import { getTechniqueById } from '../data/techniquesTable'
import type { AdventureReport, AdventureReportStep } from '../types'
import styles from './AdventureReportPage.module.css'

function getStepIconName(type: string): string {
  switch (type) {
    case 'run_started':
    case 'floor_started':
      return 'dungeonCave'
    case 'route_considered':
    case 'route_selected':
    case 'auto_choice_made':
      return 'eventRandom'
    case 'event_resolved':
      return 'eventCombat'
    case 'shop_decision':
      return 'eventShop'
    case 'blessing_decision':
      return 'techniqueScroll'
    case 'pet_decision':
      return 'beastTaming'
    case 'reward_gained':
      return 'spiritStone'
    case 'member_state_changed':
      return 'disciple'
    case 'run_retreated':
      return 'eventRest'
    case 'run_failed':
      return 'eventBoss'
    case 'run_completed':
      return 'eventAncientCave'
    default:
      return 'eventRandom'
  }
}

// ─── Boss Combat Report Helpers ──────────────────────────────────────────

function getRewardItemIconName(item: { type: string; category?: string; slot?: string; name: string }): string {
  if (item.type === 'techniqueScroll') return 'techniqueScroll'
  if (item.type === 'equipment') {
    switch (item.slot) {
      case 'head':
        return 'equipHead'
      case 'armor':
        return 'equipArmor'
      case 'bracer':
        return 'equipBracer'
      case 'belt':
        return 'equipBelt'
      case 'boots':
        return 'equipBoots'
      case 'weapon':
        return 'equipWeapon'
      case 'talisman':
        return 'equipTalisman'
      case 'accessory1':
      case 'accessory2':
        return 'equipAccessory'
      default:
        return 'typeEquipment'
    }
  }

  if (item.type === 'consumable') return item.name.includes('丹') ? 'elixir' : 'typeConsumable'
  if (item.category === 'herb') return 'herb'
  if (item.category === 'ore') return 'ore'
  return 'typeMaterial'
}

function getRewardItemMeta(item: {
  type: string
  quality: 'common' | 'spirit' | 'immortal' | 'divine' | 'chaos'
  category?: string
  techniqueId?: string
}): string {
  const qualityLabel = QUALITY_NAMES[item.quality]

  if (item.type === 'techniqueScroll') {
    const techniqueName = item.techniqueId ? (getTechniqueById(item.techniqueId)?.name ?? item.techniqueId) : '未知功法'
    return `${qualityLabel} · 功法残卷 · ${techniqueName}`
  }

  if (item.type === 'material') {
    const categoryLabel = item.category === 'herb' ? '灵草材料' : item.category === 'ore' ? '矿材' : '遗产材料'
    return `${qualityLabel} · ${categoryLabel}`
  }

  if (item.type === 'consumable') {
    return `${qualityLabel} · 消耗品`
  }

  return `${qualityLabel} · 装备`
}

type DungeonGrowthEntry = NonNullable<AdventureReport['dungeonGrowthApplied']>[string]

function formatDungeonGrowthMeta(growth: DungeonGrowthEntry): string {
  const parts = [`淇负 +${growth.cultivationGain}`]
  if (typeof growth.xpGained === 'number' && growth.xpGained > 0) {
    parts.push(`缁忛獙 +${growth.xpGained}`)
  }
  return parts.join(' 路 ')
}

function formatDungeonLevelSummary(growth: DungeonGrowthEntry): string | null {
  if (!growth.levelsGained || growth.levelsGained <= 0 || !growth.statGain || !growth.levelAfter) return null
  return `升至 Lv.${growth.levelAfter} · 气血 +${growth.statGain.hp} / 攻击 +${growth.statGain.atk} / 防御 +${growth.statGain.def}`
}

interface BossStepMeta {
  eventType: 'boss'
  combatResult?: CombatResult
  bossUnit?: CombatUnit
  teamUnits?: CombatUnit[]
  [key: string]: unknown
}

function isBossStepMeta(meta: Record<string, unknown> | undefined): meta is BossStepMeta {
  return meta?.eventType === 'boss' && meta.combatResult != null
}

interface CombatStepMeta {
  eventType: 'combat'
  combatResult?: CombatResult
  teamUnits?: CombatUnit[]
  enemyUnit?: CombatUnit
  [key: string]: unknown
}

function isCombatStepMeta(meta: Record<string, unknown> | undefined): meta is CombatStepMeta {
  return meta?.eventType === 'combat' && meta.combatResult != null
}

/** Extract key turning-point actions from a boss fight. */
function extractKeyActions(actions: CombatAction[]): CombatAction[] {
  const keyActions: CombatAction[] = []
  let foundFirstCrit = false

  for (const action of actions) {
    const bd = action.breakdown
    const isFirstCrit = !foundFirstCrit && action.isCrit
    if (isFirstCrit) foundFirstCrit = true

    const isElemental = bd != null && bd.elementMultiplier !== 1

    if (isFirstCrit || isElemental) {
      keyActions.push(action)
    }
  }

  // Always include the last action (kill blow)
  if (actions.length > 0) {
    const last = actions[actions.length - 1]
    if (last !== keyActions[keyActions.length - 1]) {
      keyActions.push(last)
    }
  }

  return keyActions
}

/** Group actions by turn number. */
function groupActionsByTurn(actions: CombatAction[]): Map<number, CombatAction[]> {
  const map = new Map<number, CombatAction[]>()
  for (const action of actions) {
    const list = map.get(action.turn) ?? []
    list.push(action)
    map.set(action.turn, list)
  }
  return map
}

/** Build per-unit damage stats. */
function buildDamageStats(
  actions: CombatAction[],
  bossUnit: CombatUnit,
  teamUnits: CombatUnit[]
): {
  teamOutput: Record<string, number>
  teamReceived: Record<string, number>
  bossOutput: number
} {
  const teamOutput: Record<string, number> = {}
  const teamReceived: Record<string, number> = {}
  let bossOutput = 0

  for (const unit of teamUnits) {
    teamOutput[unit.id] = 0
    teamReceived[unit.id] = 0
  }

  for (const action of actions) {
    if (action.actorId === bossUnit.id) {
      bossOutput += action.damage
      if (teamReceived[action.targetId] !== undefined) {
        teamReceived[action.targetId] += action.damage
      }
    } else {
      if (teamOutput[action.actorId] !== undefined) {
        teamOutput[action.actorId] += action.damage
      }
    }
  }

  return { teamOutput, teamReceived, bossOutput }
}

// ─── Animation Variants ──────────────────────────────────────────────────

/** Stagger container: children fade in one after another */
const staggerContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

/** Each section fades in and slides up slightly */
const staggerItemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
}

// ─── Combat Narrative Highlights Panel ──────────────────────────────────

const ACCENT_TYPES = new Set<CombatHighlight['type']>(['comeback', 'killing_blow'])

function CombatNarrativeHighlights({ highlights }: { highlights: CombatHighlight[] }) {
  if (highlights.length === 0) return null

  return (
    <div className={styles.narrativeSection}>
      <div className={styles.narrativeTitle}>战局叙述</div>
      <div className={styles.narrativeList}>
        {highlights.map((h, idx) => (
          <div
            key={idx}
            className={`${styles.narrativeCard} ${ACCENT_TYPES.has(h.type) ? styles.narrativeAccent : ''}`}
          >
            {h.text}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Round-by-Round Details Panel ─────────────────────────────────────

function RoundByRoundDetails({
  actions,
  bossUnit,
  teamUnits: _teamUnits,
}: {
  actions: CombatAction[]
  bossUnit: CombatUnit
  teamUnits: CombatUnit[]
}) {
  const [expanded, setExpanded] = useState(false)
  const turnMap = useMemo(() => groupActionsByTurn(actions), [actions])
  const turns = useMemo(() => [...turnMap.entries()].sort(([a], [b]) => a - b), [turnMap])

  if (actions.length === 0) return null

  return (
    <div className={styles.roundDetailsWrapper}>
      <button className={styles.roundToggle} onClick={() => setExpanded(!expanded)}>
        {expanded ? '收起明细 ▲' : `展开全部 ${turns.length} 回合明细 ▼`}
      </button>
      {expanded && (
        <div className={styles.roundDetailsList}>
          {turns.map(([turnNum, turnActions]) => (
            <div key={turnNum} className={styles.roundGroup}>
              <div className={styles.roundHeader}>回合 {turnNum}</div>
              {turnActions.map((action, idx) => {
                const isAlly = action.actorId !== bossUnit.id
                return (
                  <div
                    key={idx}
                    className={`${styles.roundAction} ${isAlly ? styles.roundActionAlly : styles.roundActionEnemy}`}
                  >
                    <span className={styles.roundActor}>{action.actorName}</span>
                    <span className={styles.roundArrow}>→</span>
                    <span className={styles.roundTarget}>{action.targetName}</span>
                    {action.skillName && <span className={styles.roundSkill}>[{action.skillName}]</span>}
                    <span className={styles.roundDamage}>
                      {action.damage}
                      {action.isCrit ? ' 暴击!' : ''}
                    </span>
                    {action.breakdown && action.breakdown.elementMultiplier !== 1 && (
                      <span className={styles.roundElement}>克制 x{action.breakdown.elementMultiplier}</span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Boss Combat Report Panel ──────────────────────────────────────────

function BossCombatReport({ meta }: { meta: BossStepMeta }) {
  const combatResult = meta.combatResult!
  const bossUnit = meta.bossUnit
  const teamUnits = meta.teamUnits

  if (!bossUnit || !teamUnits) return null

  const keyActions = extractKeyActions(combatResult.actions)
  const { teamOutput, teamReceived, bossOutput } = buildDamageStats(combatResult.actions, bossUnit, teamUnits)
  const narrative = extractNarrative(combatResult, bossUnit, teamUnits)

  return (
    <div className={styles.bossPanel}>
      {/* Victory status */}
      <div className={styles.bossResultLine}>
        {combatResult.victory ? '击败首领' : '首领战失利'} -- 共 {combatResult.turns} 回合
      </div>

      {/* Key turning-point actions */}
      <div className={styles.bossSectionTitle}>关键回合</div>
      <div className={styles.bossKeyActions}>
        {keyActions.map((action, idx) => (
          <div key={idx} className={styles.bossKeyAction}>
            <span className={styles.bossKeyTurn}>回合 {action.turn}</span>
            <span className={styles.bossKeyActionText}>
              {action.actorName}
              {' -> '}
              {action.targetName}
              {action.skillName ? ` [${action.skillName}]` : ''}
            </span>
            <span className={styles.bossKeyDamage}>
              {action.damage}
              {action.isCrit ? ' 暴击' : ''}
            </span>
            {action.breakdown && action.breakdown.elementMultiplier !== 1 && (
              <span className={styles.bossKeyElement}>元素克制 x{action.breakdown.elementMultiplier}</span>
            )}
          </div>
        ))}
      </div>

      {/* Combat narrative highlights */}
      <CombatNarrativeHighlights highlights={narrative.highlights} />

      {/* Round-by-round details */}
      <div className={styles.bossSectionTitle}>回合明细</div>
      <RoundByRoundDetails actions={combatResult.actions} bossUnit={bossUnit} teamUnits={teamUnits} />

      {/* Damage statistics */}
      <div className={styles.bossSectionTitle}>伤害统计</div>
      <div className={styles.bossDamageGrid}>
        {teamUnits.map((unit) => (
          <Fragment key={unit.id}>
            <span>{unit.name} 输出</span>
            <strong>{teamOutput[unit.id]}</strong>
            <span>{unit.name} 承伤</span>
            <strong>{teamReceived[unit.id]}</strong>
          </Fragment>
        ))}
        <span>{bossUnit.name} 输出</span>
        <strong>{bossOutput}</strong>
      </div>

      {/* Element counter reference */}
      <div className={styles.bossElementRef}>火 -- 冰 1.5x | 冰 -- 雷 1.5x | 雷 -- 火 1.5x</div>
    </div>
  )
}

// ─── Regular Combat Report Panel (collapsible) ──────────────────────────

function CombatReportPanel({ meta }: { meta: CombatStepMeta }) {
  const combatResult = meta.combatResult!
  const teamUnits = meta.teamUnits
  const enemyUnit = meta.enemyUnit

  const [expanded, setExpanded] = useState(false)

  // Simple stats
  const totalTeamDmg = combatResult.actions
    .filter((a) => (teamUnits ?? []).some((u) => u.id === a.actorId))
    .reduce((sum, a) => sum + a.damage, 0)
  const totalEnemyDmg = combatResult.actions
    .filter((a) => enemyUnit && a.actorId === enemyUnit.id)
    .reduce((sum, a) => sum + a.damage, 0)

  const narrative = enemyUnit ? extractNarrative(combatResult, enemyUnit, teamUnits ?? []) : { highlights: [] }

  return (
    <div className={styles.combatPanel}>
      <div className={styles.combatSummary}>
        <span>
          {combatResult.victory ? '胜利' : '落败'} · {combatResult.turns} 回合
        </span>
        {enemyUnit && (
          <span className={styles.combatEnemyName}>
            vs {enemyUnit.name} (HP {enemyUnit.maxHp})
          </span>
        )}
        <span className={styles.combatDmgStat}>
          队伍输出 {totalTeamDmg} / 承伤 {totalEnemyDmg}
        </span>
      </div>
      {expanded && enemyUnit && (
        <div className={styles.combatDetails}>
          <CombatNarrativeHighlights highlights={narrative.highlights} />
          <RoundByRoundDetails actions={combatResult.actions} bossUnit={enemyUnit} teamUnits={teamUnits ?? []} />
        </div>
      )}
      <button className={styles.roundToggle} onClick={() => setExpanded(!expanded)}>
        {expanded ? '收起明细 ▲' : '展开回合明细 ▼'}
      </button>
    </div>
  )
}

/** Group steps by floor number, Collapsible groups; boss floor expanded by default. */
function FloorGroupedTimeline({ steps }: { steps: AdventureReportStep[] }) {
  const groups = useMemo(() => {
    const floorMap = new Map<number | null, AdventureReportStep[]>()
    for (const step of steps) {
      const key = step.floor
      const list = floorMap.get(key) ?? []
      list.push(step)
      floorMap.set(key, list)
    }

    const entries = [...floorMap.entries()]
    entries.sort((a, b) => {
      if (a[0] === null && b[0] === null) return 0
      if (a[0] === null) return -1
      if (b[0] === null) return 1
      return (a[0] as number) - (b[0] as number)
    })
    return entries.map(([floor, floorSteps]) => ({ floor, steps: floorSteps }))
  }, [steps])

  const lastFloor = useMemo(() => {
    const floorNums = groups.map((g) => g.floor).filter((f): f is number => f !== null)
    return floorNums.length > 0 ? Math.max(...floorNums) : null
  }, [groups])

  const [collapsed, setCollapsed] = useState<Set<number | null>>(new Set())

  const toggle = useCallback((floor: number | null) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(floor)) next.delete(floor)
      else next.add(floor)
      return next
    })
  }, [])

  if (groups.length === 0) return null

  return (
    <section className={styles.timelineSection}>
      <div className={styles.sectionTitle}>时间线</div>
      <div className={`${styles.sectionScroll} ${styles.timelineScroll}`} data-testid="report-timeline-scroll">
        <div className={styles.timeline}>
          {groups.map((group) => {
            const isBoss = group.floor === lastFloor
            const isExpanded = !collapsed.has(group.floor)
            const combatCount = group.steps.filter(
              (s) => s.type === 'event_resolved' && s.detail?.includes('击败了')
            ).length

            return (
              <div key={group.floor ?? 'run'} className={`${styles.floorGroup} ${isBoss ? styles.floorGroupBoss : ''}`}>
                <div className={styles.floorGroupHeader} onClick={() => toggle(group.floor)}>
                  <span className={styles.floorGroupToggle}>{isExpanded ? '▼' : '▶'}</span>
                  <span className={styles.floorGroupLabel}>
                    {group.floor === null ? '总览' : isBoss ? `第 ${group.floor} 层 · 首领战` : `第 ${group.floor} 层`}
                  </span>
                  {!isExpanded && (
                    <span className={styles.floorGroupSummary}>
                      {group.steps.length} 条记录
                      {combatCount > 0 ? ` · ${combatCount} 场战斗` : ''}
                    </span>
                  )}
                </div>

                {isExpanded && (
                  <div className={styles.floorSteps}>
                    {group.steps.map((step) => (
                      <article key={step.id} className={styles.stepCard}>
                        <div className={styles.stepHeader}>
                          <span className={styles.stepSummary}>
                            <PixelIcon
                              name={getStepIconName(step.type)}
                              size={16}
                              className={styles.inlineIcon}
                              aria-label={step.summary}
                            />
                            {step.summary}
                          </span>
                          {step.floor !== null && <span className={styles.stepFloor}>第 {step.floor} 层</span>}
                        </div>
                        <div className={styles.stepDetail}>{step.detail}</div>
                        {step.decisionReason && (
                          <div className={styles.stepReason}>决策依据：{step.decisionReason}</div>
                        )}
                        {isBossStepMeta(step.meta) && <BossCombatReport meta={step.meta} />}
                        {isCombatStepMeta(step.meta) && <CombatReportPanel meta={step.meta} />}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default function AdventureReportPage() {
  const { reportId } = useParams()
  const report = useAdventureStore((s) => (reportId ? s.getReport(reportId) : undefined))
  const dungeon = useAdventureStore((s) => s.dungeons.find((item) => item.id === report?.dungeonId))
  const characters = useSectStore((s) => s.sect.characters)
  const archiveMilestones = useSectStore((s) => s.sect.archiveMilestones)
  const prefersReducedMotion = useReducedMotion()

  const characterNameMap = useMemo(() => {
    const map = new Map(characters.map((character) => [character.id, character.name]))
    if (report?.teamSnapshot) {
      for (const [charId, snapshot] of Object.entries(report.teamSnapshot)) {
        if (!map.has(charId)) map.set(charId, snapshot.name)
      }
    }
    return map
  }, [characters, report])
  const insight = report ? buildAdventureReportInsight(report, characterNameMap) : null
  const legacyFlavor = report ? getLegacyReportFlavor(report.dungeonId) : null
  const reportLoopSignal = useMemo(() => {
    if (!report || report.dungeonId !== 'guixuRift') return null
    const tideCrystalCount = report.itemRewards.filter((item) => item.name === '归墟潮晶').length
    const abyssShardCount = report.itemRewards.filter((item) => item.name === '渊息残片').length
    const hasLegacyTrinity = archiveMilestones.some((milestone) => milestone.id === 'legacyForgeTrinity')
    const hasLegacyPair = archiveMilestones.some((milestone) => milestone.id === 'legacyForgePair')

    if (hasLegacyTrinity) {
      return {
        title: '归墟终盘循环',
        detail: `当前宗门已完成三遗齐鸣，这次战报属于可长期挂机的高阶归墟循环。潮晶 ${tideCrystalCount}，残片 ${abyssShardCount}。`,
      }
    }
    if (hasLegacyPair) {
      return {
        title: '归墟共鸣循环',
        detail: `当前宗门已完成双遗共鸣，适合继续稳定挂归墟回响补第三件遗器。潮晶 ${tideCrystalCount}，残片 ${abyssShardCount}。`,
      }
    }
    return null
  }, [archiveMilestones, report])

  if (!report) {
    return (
      <div className={styles.page}>
        <h1 className={styles.pageTitle}>探索过程</h1>
        <div className={styles.empty}>未找到对应的探索报告。</div>
      </div>
    )
  }

  // Result banner animation based on outcome
  const resultBadgeAnimate =
    report.result === 'completed'
      ? { opacity: [0, 1], scale: [0.9, 1] }
      : report.result === 'failed'
        ? { opacity: [0, 1], x: [0, -4, 4, -3, 3, 0] }
        : { opacity: [0, 1] }

  const resultBadgeTransition =
    report.result === 'completed'
      ? { duration: 0.5, ease: 'easeOut' as const }
      : report.result === 'failed'
        ? { duration: 0.4, ease: 'easeOut' as const, x: { duration: 0.3 } }
        : { duration: 0.3, ease: 'easeOut' as const }

  const shouldAnimate = !prefersReducedMotion

  return (
    <div className={styles.page}>
      <PageHeader
        title="探索过程"
        action={
          <Link className={styles.backLink} to="/adventure">
            返回秘境
          </Link>
        }
        metrics={[
          {
            label: '秘境',
            value: dungeon?.name ?? report.dungeonId,
            detail: getRunIntentDef(report.config.automationStrategy).label,
          },
          {
            label: '结果',
            value: REPORT_RESULT_LABELS[report.result],
            detail: getTacticalPresetLabel(report.config.tacticalPreset),
          },
          {
            label: report.result === 'completed' ? '通关层数' : '到达层数',
            value: `第 ${report.floorsCleared} 层`,
            detail: insight?.cause ?? '暂无原因摘要',
          },
        ]}
      />

      {legacyFlavor ? (
        <section className={styles.legacyBanner}>
          <div className={styles.legacyBannerEyebrow}>{legacyFlavor.reportEyebrow}</div>
          <div className={styles.legacyBannerTitle}>{legacyFlavor.title}</div>
          <div className={styles.legacyBannerDetail}>{legacyFlavor.reportCause}</div>
        </section>
      ) : null}

      <motion.div
        variants={shouldAnimate ? staggerContainerVariants : undefined}
        initial={shouldAnimate ? 'hidden' : false}
        animate="visible"
      >
        {/* Section 1: Result banner + highlight card */}
        <motion.section
          className={styles.highlightCard}
          data-testid="report-highlight"
          variants={shouldAnimate ? staggerItemVariants : undefined}
        >
          <div className={styles.highlightTop}>
            <div>
              <motion.div
                className={`${styles.resultBadge} ${report.result === 'completed' ? styles.resultBadgeCompleted : ''}`}
                animate={shouldAnimate ? resultBadgeAnimate : undefined}
                transition={resultBadgeTransition}
              >
                {REPORT_RESULT_LABELS[report.result]}
              </motion.div>
            </div>
            <div className={styles.highlightMeta}>
              <span>{getRunIntentDef(report.config.automationStrategy).label}</span>
              <span>{getTacticalPresetLabel(report.config.tacticalPreset)}</span>
              <span>第 {report.floorsCleared} 层</span>
            </div>
          </div>

          <div className={styles.highlightCause}>
            <span className={styles.highlightCauseLabel}>成败原因</span>
            <strong>{insight?.cause ?? '暂无'}</strong>
          </div>

          {/* Risk and confidence section */}
          {report.riskTier ? (
            <div className={styles.riskSection}>
              <div className={styles.riskSectionHeader}>
                <span className={styles.riskSectionLabel}>{getRiskTierLabel(report.riskTier)}</span>
                {isHighRiskTemplate(report.templateId ?? '') ? <span className={styles.riskHighTag}>押注</span> : null}
              </div>
              <div className={styles.riskSectionDesc}>{getRiskDescription(report.riskTier)}</div>
              {report.templateId
                ? (() => {
                    const riskHook = getTemplateRiskHook(report.templateId)
                    if (!riskHook) return null
                    return (
                      <div className={styles.riskBetResult}>
                        {report.result === 'completed' ? (
                          <div className={styles.riskBetWon}>
                            <span className={styles.riskBetLabel}>赌到了</span>
                            <div className={styles.riskTagList}>
                              {riskHook.exclusiveRewards.map((r) => (
                                <span key={r} className={styles.riskTag}>
                                  {r}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className={styles.riskBetLost}>
                            <span className={styles.riskBetLabel}>伤到了节奏</span>
                            <div className={styles.riskTagList}>
                              {riskHook.likelyPenalty.map((p) => (
                                <span key={p} className={styles.riskTagPenalty}>
                                  {p}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()
                : null}
              {/* Confidence change */}
              {report.confidenceBefore !== undefined && report.confidenceAfter !== undefined ? (
                <div className={styles.confidenceChange}>
                  <span className={styles.confidenceChangeLabel}>模板可信度</span>
                  <span className={styles.confidenceChangeValues}>
                    {report.confidenceBefore} {'→'} {report.confidenceAfter}
                    {' ('}
                    {report.confidenceAfter > report.confidenceBefore ? '+' : ''}
                    {report.confidenceAfter - report.confidenceBefore})
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}

          {reportLoopSignal ? (
            <div className={styles.loopSignalCard} data-testid="report-loop-signal">
              <span className={styles.loopSignalLabel}>{reportLoopSignal.title}</span>
              <strong>{reportLoopSignal.detail}</strong>
            </div>
          ) : null}

          <div className={styles.highlightGrid}>
            <div className={styles.highlightPanel}>
              <div className={styles.highlightPanelTitle}>关键角色</div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>
                  <PixelIcon name="disciple" size={16} className={styles.inlineIcon} aria-label="核心弟子" />
                  核心弟子
                </span>
                <strong>{insight?.coreName ?? '暂无'}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>
                  <PixelIcon name="eventCombat" size={16} className={styles.inlineIcon} aria-label="转折点" />
                  转折点
                </span>
                <strong>{insight?.turningPoint ?? '暂无'}</strong>
              </div>
            </div>

            <div className={styles.highlightPanel}>
              <div className={styles.highlightPanelTitle}>构筑余势</div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>
                  <PixelIcon name="eventRandom" size={16} className={styles.inlineIcon} aria-label="关键构筑" />
                  关键构筑
                </span>
                <strong>{insight?.keyBuild ?? '暂无'}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>
                  <PixelIcon name="eventRandom" size={16} className={styles.inlineIcon} aria-label="异变" />
                  异变
                </span>
                <strong>{insight?.mutationHighlights?.join(' · ') ?? '暂无异变'}</strong>
              </div>
            </div>

            <div className={styles.highlightPanel}>
              <div className={styles.highlightPanelTitle}>归宗结果</div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>
                  <PixelIcon name="eventBoss" size={16} className={styles.inlineIcon} aria-label="未归" />
                  未归
                </span>
                <strong>{insight?.returnOutcome.sacrificedNames.join('、') || '无'}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>
                  <PixelIcon name="eventRest" size={16} className={styles.inlineIcon} aria-label="重伤归宗" />
                  重伤归宗
                </span>
                <strong>{insight?.returnOutcome.recoveringNames.join('、') || '无'}</strong>
              </div>
              {insight?.returnOutcome.returnedNames.length ? (
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>
                    <PixelIcon name="disciple" size={16} className={styles.inlineIcon} aria-label="平安归宗" />
                    平安归宗
                  </span>
                  <strong>{insight.returnOutcome.returnedNames.join('、')}</strong>
                </div>
              ) : null}
            </div>
          </div>
        </motion.section>

        {/* Section 2: Floor timeline */}
        <motion.div variants={shouldAnimate ? staggerItemVariants : undefined}>
          <FloorGroupedTimeline steps={report.steps} />
        </motion.div>

        {/* Section 3: Reward summary */}
        <motion.section className={styles.summaryCard} variants={shouldAnimate ? staggerItemVariants : undefined}>
          <div className={styles.sectionTitle}>结算</div>
          <div className={`${styles.sectionScroll} ${styles.compactScroll}`} data-testid="report-rewards-scroll">
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>
                <PixelIcon name="spiritStone" size={16} className={styles.inlineIcon} aria-label="灵石" />
                灵石
              </span>
              <strong>{report.rewards.spiritStone}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>
                <PixelIcon name="herb" size={16} className={styles.inlineIcon} aria-label="灵草" />
                灵草
              </span>
              <strong>{report.rewards.herb}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>
                <PixelIcon name="ore" size={16} className={styles.inlineIcon} aria-label="矿材" />
                矿材
              </span>
              <strong>{report.rewards.ore}</strong>
            </div>
            {report.itemRewards.length > 0 ? (
              <div className={styles.itemRewardBlock}>
                <div className={styles.itemRewardTitle}>战利品</div>
                <div className={styles.itemRewardList}>
                  {report.itemRewards.map((item) => (
                    <div key={item.id} className={styles.itemRewardRow}>
                      <div className={styles.itemRewardMain}>
                        <PixelIcon
                          name={getRewardItemIconName(item)}
                          size={16}
                          className={styles.inlineIcon}
                          aria-label={item.name}
                        />
                        <span className={styles.itemRewardName}>{item.name}</span>
                      </div>
                      <span className={styles.itemRewardMeta}>{getRewardItemMeta(item)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </motion.section>

        {/* Section 4: Growth summary */}
        {(report.comprehensionGrowth || report.dungeonGrowthApplied) && (
          <motion.section className={styles.summaryCard} variants={shouldAnimate ? staggerItemVariants : undefined}>
            <div className={styles.sectionTitle}>弟子磨练</div>
            <div className={`${styles.sectionScroll} ${styles.compactScroll}`} data-testid="report-growth-scroll">
              {report.comprehensionGrowth &&
                Object.entries(report.comprehensionGrowth).map(([charId, techGrowth]) => {
                  const charName = characterNameMap.get(charId) ?? charId
                  const entries = Object.entries(techGrowth)
                  if (entries.length === 0) return null
                  return (
                    <div
                      key={charId}
                      className={`${styles.summaryRow} ${styles.growthRow}`}
                      data-testid={`report-growth-${charId}`}
                    >
                      <span className={styles.summaryLabel}>
                        <PixelIcon name="techniqueScroll" size={16} className={styles.inlineIcon} aria-label="参悟" />
                        {charName} 参悟
                      </span>
                      <strong>
                        {entries
                          .map(([techId, growth]) => {
                            const techName = getTechniqueById(techId)?.name ?? techId
                            return `${techName} +${growth}`
                          })
                          .join('、')}
                      </strong>
                    </div>
                  )
                })}
              {report.dungeonGrowthApplied &&
                Object.entries(report.dungeonGrowthApplied).map(([charId, growth]) => {
                  const charName = characterNameMap.get(charId) ?? charId
                  const levelSummary = formatDungeonLevelSummary(growth)
                  return (
                    <div
                      key={charId}
                      className={`${styles.summaryRow} ${styles.growthRow}`}
                      data-testid={`report-growth-${charId}`}
                    >
                      <span className={styles.summaryLabel}>
                        <PixelIcon name="disciple" size={16} className={styles.inlineIcon} aria-label="属性提升" />
                        {charName} 属性
                      </span>
                      <strong>
                        气血 +{growth.statBoost} · 修为 +{growth.cultivationGain}
                      </strong>
                      <span className={styles.growthLevelHint}>{formatDungeonGrowthMeta(growth)}</span>
                      {levelSummary ? <span className={styles.growthLevelHint}>{levelSummary}</span> : null}
                    </div>
                  )
                })}
            </div>
          </motion.section>
        )}
      </motion.div>
    </div>
  )
}
