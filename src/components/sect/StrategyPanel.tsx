import { useMemo, useState } from 'react'
import { useSectStore } from '../../stores/sectStore'
import { SECT_RISK_POLICY_LIST } from '../../data/sectRiskPolicies'
import { DESTINY_AMPLIFIER_LIST } from '../../data/destinyAmplifiers'
import { getDarkCurrentTier } from '../../systems/destiny/DarkCurrentSystem'
import type { SectRiskPolicyId, DestinyAmplifierId, SectDarkCurrent } from '../../types/destiny'
import styles from './StrategyPanel.module.css'

const DARK_CURRENT_FAMILY_LABELS: Record<keyof Omit<SectDarkCurrent, 'lastShiftAt'>, string> = {
  fortune: '机缘',
  tribulation: '劫火',
  abyss: '心渊',
  guardian: '护命',
  plunder: '夺运',
  afterglow: '残照',
  anomaly: '异相',
}

const DARK_CURRENT_FAMILIES: (keyof Omit<SectDarkCurrent, 'lastShiftAt'>)[] = [
  'fortune',
  'tribulation',
  'abyss',
  'guardian',
  'plunder',
  'afterglow',
  'anomaly',
]

const MAX_AMPLIFIERS = 3

function getDarkCellClass(value: number): string {
  const tier = getDarkCurrentTier(value)
  switch (tier) {
    case 'strong':
      return styles.darkCellStrong
    case 'significant':
      return styles.darkCellSignificant
    case 'perceptible':
      return styles.darkCellPerceptible
    default:
      return styles.darkCellBg
  }
}

export default function StrategyPanel() {
  const sect = useSectStore((s) => s.sect)
  const setPolicy = useSectStore((s) => s.setPolicy)
  const setAmplifiers = useSectStore((s) => s.setAmplifiers)

  const { strategySettings, darkCurrent } = sect
  const activePolicy = strategySettings.activePolicy
  const activeAmplifiers = strategySettings.activeAmplifiers

  // Use state so the purity checker doesn't flag Date.now() in useMemo
  const [renderTime] = useState(() => Date.now())

  const hasNoticeableDarkCurrent = useMemo(
    () => DARK_CURRENT_FAMILIES.some((f) => getDarkCurrentTier(darkCurrent[f]) !== 'background'),
    [darkCurrent]
  )

  const cooldownRemaining = useMemo(() => {
    if (!strategySettings.lastSwitchedAt) return 0
    const elapsed = (renderTime - strategySettings.lastSwitchedAt) / (1000 * 60 * 60 * 24)
    return Math.max(0, strategySettings.switchCooldownDays - elapsed)
  }, [strategySettings.lastSwitchedAt, strategySettings.switchCooldownDays, renderTime])

  function handlePolicyClick(id: SectRiskPolicyId) {
    if (id === activePolicy) return
    setPolicy(id)
  }

  function handleAmplifierToggle(id: DestinyAmplifierId) {
    const current = [...activeAmplifiers]
    const idx = current.indexOf(id)
    if (idx >= 0) {
      current.splice(idx, 1)
    } else if (current.length < MAX_AMPLIFIERS) {
      current.push(id)
    }
    setAmplifiers(current)
  }

  const activePolicyProfile = SECT_RISK_POLICY_LIST.find((p) => p.id === activePolicy)

  return (
    <div className={styles.container}>
      <div className={styles.title}>宗门方针</div>
      <div className={styles.subtitle}>选择宗门的冒险倾向，影响核心弟子数与风险偏好</div>

      {/* Active policy summary */}
      <div className={styles.activeRow}>
        <span className={styles.activeLabel}>方针</span>
        <div>
          <div className={styles.activeValue}>{activePolicyProfile?.name ?? '审机'}</div>
          <div className={styles.activeDesc}>{activePolicyProfile?.description}</div>
        </div>
        {cooldownRemaining > 0 && <span className={styles.cooldownHint}>冷却 {cooldownRemaining.toFixed(1)} 天</span>}
      </div>

      {/* Policy picker grid */}
      <div className={styles.policyGrid}>
        {SECT_RISK_POLICY_LIST.map((policy, idx) => {
          const isActive = policy.id === activePolicy
          const isAggressive = idx >= 4
          return (
            <button
              key={policy.id}
              className={`${styles.policyCard} ${isActive ? styles.policyCardActive : ''}`}
              onClick={() => handlePolicyClick(policy.id)}
            >
              <div className={styles.policyHeader}>
                <span className={styles.policyName}>{policy.name}</span>
                <span className={styles.policyIdx}>#{idx + 1}</span>
              </div>
              <div className={styles.policyDesc}>{policy.description}</div>
              <div className={styles.policyMeta}>
                <span className={`${styles.policyTag} ${isAggressive ? styles.policyTagAggressive : ''}`}>
                  {isAggressive ? '激进' : idx >= 2 ? '中线' : '稳健'}
                </span>
                <span className={styles.policyTag}>核心 {policy.maxCoreDisciples} 人</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Amplifier section */}
      <div className={styles.ampSection}>
        <div className={styles.ampTitle}>
          命运标签 ({activeAmplifiers.length}/{MAX_AMPLIFIERS})
        </div>
        <div className={styles.ampSubtitle}>选择后放大对应类型事件的发生概率</div>
        <div className={styles.ampGrid}>
          {DESTINY_AMPLIFIER_LIST.map((amp) => {
            const isActive = activeAmplifiers.includes(amp.id)
            return (
              <button
                key={amp.id}
                className={`${styles.ampCard} ${isActive ? styles.ampCardActive : ''}`}
                onClick={() => handleAmplifierToggle(amp.id)}
              >
                <div className={styles.ampName}>{amp.name}</div>
                <div className={styles.ampDesc}>{amp.description}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Dark current overview */}
      {hasNoticeableDarkCurrent && (
        <div className={styles.darkSection}>
          <div className={styles.darkTitle}>
            宗门暗流
            <span className={styles.darkHint}> — 影响招募倾向与秘境事件分布</span>
          </div>
          <div className={styles.darkGrid}>
            {DARK_CURRENT_FAMILIES.map((family) => {
              const value = darkCurrent[family]
              return (
                <div key={family} className={`${styles.darkCell} ${getDarkCellClass(value)}`}>
                  <div className={styles.darkCellLabel}>{DARK_CURRENT_FAMILY_LABELS[family]}</div>
                  <div className={styles.darkCellValue}>{value}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
