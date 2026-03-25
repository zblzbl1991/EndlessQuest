import { useState, useEffect } from 'react'
import { useSectStore } from '../../stores/sectStore'
import styles from './TransmissionPanel.module.css'

const COOLDOWN_MS = 60000

export default function TransmissionPanel() {
  const sect = useSectStore((s) => s.sect)
  const groupTransmission = useSectStore((s) => s.groupTransmission)
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)

  const trainingHallLevel = sect.buildings.find(b => b.type === 'trainingHall')?.level ?? 0
  const cultivatingCount = sect.characters.filter(c => c.status === 'cultivating').length
  const cost = 50 * cultivatingCount
  const canAfford = sect.resources.spiritEnergy >= cost && cultivatingCount > 0

  // Cooldown timer
  useEffect(() => {
    const elapsed = Date.now() - sect.lastTransmissionTime
    if (elapsed < COOLDOWN_MS) {
      setCooldownRemaining(Math.ceil((COOLDOWN_MS - elapsed) / 1000))
      const timer = setInterval(() => {
        const remaining = COOLDOWN_MS - (Date.now() - sect.lastTransmissionTime)
        if (remaining <= 0) {
          setCooldownRemaining(0)
          clearInterval(timer)
        } else {
          setCooldownRemaining(Math.ceil(remaining / 1000))
        }
      }, 1000)
      return () => clearInterval(timer)
    } else {
      setCooldownRemaining(0)
    }
  }, [sect.lastTransmissionTime])

  const onCooldown = cooldownRemaining > 0

  const handleTransmission = () => {
    const result = groupTransmission()
    if (result.success) {
      setMessage({ success: true, text: `集体传功成功，${result.charactersUpdated}名弟子修为提升` })
      setCooldownRemaining(Math.ceil(COOLDOWN_MS / 1000))
    } else {
      setMessage({ success: false, text: result.reason })
    }
    setTimeout(() => setMessage(null), 2000)
  }

  return (
    <div className={styles.buildingPanel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>传功殿 Lv{trainingHallLevel}</span>
        <span className={styles.resourceDisplay}>
          灵气 {Math.floor(sect.resources.spiritEnergy)}
        </span>
      </div>

      <div className={styles.transmissionInfo}>
        <div className={styles.transmissionDesc}>
          集体传功，为所有修炼中的弟子瞬间增加修为。
        </div>
        <div className={styles.transmissionCost}>
          费用: {cost} 灵气（每位修炼弟子 50 灵气）
        </div>
        <div className={styles.transmissionEffect}>
          效果: 每人瞬间获得下一境界修炼需求的 10% 修为
        </div>
        <div className={styles.transmissionCultivating}>
          当前修炼弟子: {cultivatingCount} 人
        </div>
      </div>

      <button
        className={`${styles.transmissionBtn} ${(!canAfford || onCooldown) ? styles.transmissionDisabled : ''}`}
        onClick={handleTransmission}
        disabled={!canAfford || onCooldown}
      >
        {onCooldown
          ? `冷却中 (${cooldownRemaining}秒)`
          : cultivatingCount === 0
            ? '无修炼弟子'
            : `集体传功 (${cost}灵气)`}
      </button>

      {message && (
        <div className={message.success ? 'globalMessageSuccess' : 'globalMessageFail'}>
          {message.text}
        </div>
      )}
    </div>
  )
}
