import { useState } from 'react'
import { useSectStore } from '../../stores/sectStore'
import { getTechniqueById } from '../../data/techniquesTable'
import { TECHNIQUE_TIER_NAMES } from '../../types/technique'
import styles from './StudyPanel.module.css'

export default function StudyPanel() {
  const sect = useSectStore((s) => s.sect)
  const studyTechnique = useSectStore((s) => s.studyTechnique)
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null)

  const scriptureLevel = sect.buildings.find(b => b.type === 'scriptureHall')?.level ?? 0
  const cost = 100 * sect.level
  const canAfford = sect.resources.spiritStone >= cost

  const maxRealm = sect.characters.length > 0
    ? Math.max(...sect.characters.map(c => c.realm))
    : 0
  const tierNames = ['凡级', '灵级', '仙级', '神级', '混沌级']
  const maxTierName = tierNames[Math.min(maxRealm, tierNames.length - 1)] ?? '凡级'

  const handleStudy = () => {
    const result = studyTechnique()
    if (result.success) {
      const technique = getTechniqueById(result.reason)
      setMessage({ success: true, text: technique ? `参悟成功：获得 ${technique.name}（${TECHNIQUE_TIER_NAMES[technique.tier]}）` : '参悟成功' })
    } else {
      setMessage({ success: false, text: result.reason })
    }
    setTimeout(() => setMessage(null), 2000)
  }

  return (
    <div className={styles.buildingPanel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>藏经阁 Lv{scriptureLevel}</span>
        <span className={styles.resourceDisplay}>
          灵石 {sect.resources.spiritStone}
        </span>
      </div>

      <div className={styles.studyInfo}>
        <div className={styles.studyDesc}>
          参悟功法，随机解锁一部功法至宗门功法图鉴。
        </div>
        <div className={styles.studyCost}>
          费用: {cost} 灵石
        </div>
        <div className={styles.studyNote}>
          功法最高品质: {maxTierName}（根据弟子最高境界决定）
        </div>
      </div>

      <button
        className={`${styles.studyBtn} ${!canAfford ? styles.studyDisabled : ''}`}
        onClick={handleStudy}
        disabled={!canAfford}
      >
        参悟功法
      </button>

      {message && (
        <div className={message.success ? 'globalMessageSuccess' : 'globalMessageFail'}>
          {message.text}
        </div>
      )}
    </div>
  )
}
