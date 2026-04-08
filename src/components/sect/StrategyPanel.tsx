import { useMemo, useState } from 'react'
import { useSectStore } from '../../stores/sectStore'
import { SECT_RISK_POLICY_LIST } from '../../data/sectRiskPolicies'
import type { SectRiskPolicyId } from '../../types/destiny'
import styles from './StrategyPanel.module.css'

export default function StrategyPanel() {
  const sect = useSectStore((s) => s.sect)
  const setPolicy = useSectStore((s) => s.setPolicy)

  const { strategySettings } = sect
  const activePolicy = strategySettings.activePolicy

  // Use state so the purity checker doesn't flag Date.now() in useMemo
  const [renderTime] = useState(() => Date.now())

  const cooldownRemaining = useMemo(() => {
    if (!strategySettings.lastSwitchedAt) return 0
    const elapsed = (renderTime - strategySettings.lastSwitchedAt) / (1000 * 60 * 60 * 24)
    return Math.max(0, strategySettings.switchCooldownDays - elapsed)
  }, [strategySettings.lastSwitchedAt, strategySettings.switchCooldownDays, renderTime])

  function handlePolicyClick(id: SectRiskPolicyId) {
    if (id === activePolicy) return
    setPolicy(id)
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
          <div className={styles.activeValue}>{activePolicyProfile?.name ?? '均衡'}</div>
          <div className={styles.activeDesc}>{activePolicyProfile?.description}</div>
        </div>
        {cooldownRemaining > 0 && <span className={styles.cooldownHint}>冷却 {cooldownRemaining.toFixed(1)} 天</span>}
      </div>

      {/* Policy picker grid */}
      <div className={styles.policyGrid}>
        {SECT_RISK_POLICY_LIST.map((policy) => {
          const isActive = policy.id === activePolicy
          return (
            <button
              key={policy.id}
              className={`${styles.policyCard} ${isActive ? styles.policyCardActive : ''}`}
              onClick={() => handlePolicyClick(policy.id)}
            >
              <div className={styles.policyHeader}>
                <span className={styles.policyName}>{policy.name}</span>
              </div>
              <div className={styles.policyDesc}>{policy.description}</div>
              <div className={styles.policyMeta}>
                <span className={styles.policyTag}>核心 {policy.maxCoreDisciples} 人</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
