import { useSectStore } from '../../stores/sectStore'
import { CAVE_HEAVENS, caveHeavenSlotCount, calcAptitude, aggregateCaveHeavenEffects } from '../../data/caveHeavens'
import styles from './CaveHeavenPanel.module.css'

/**
 * 洞天福地（V2.2 工单 04）：派驻配置层。
 * 显示洞天列表（解锁条件/派驻状态/资质加成），派驻与撤出操作。
 */
export default function CaveHeavenPanel() {
  const sect = useSectStore((s) => s.sect)
  const assignCaveHeaven = useSectStore((s) => s.assignCaveHeaven)
  const bestRealm = sect.characters.reduce((max, c) => Math.max(max, c.realm), 0)
  const slots = caveHeavenSlotCount(bestRealm)
  const assignments = sect.caveHeavenAssignments ?? {}
  const idleCharacters = sect.characters.filter((c) => c.status === 'idle')

  return (
    <div className={styles.panel} data-testid="cave-heaven-panel">
      <div className={styles.header}>
        <span>洞天福地</span>
        <span className={styles.slots}>
          已开辟 {Math.min(Object.keys(assignments).length, slots)} / {slots} 处
        </span>
      </div>
      {CAVE_HEAVENS.map((cave) => {
        const unlocked = bestRealm >= cave.unlockRealm
        const occupantId = assignments[cave.id]
        const occupant = sect.characters.find((c) => c.id === occupantId)
        const aptitude = occupant ? calcAptitude(occupant) : 0
        return (
          <div key={cave.id} className={`${styles.item} ${unlocked ? '' : styles.locked}`}>
            <div className={styles.itemMain}>
              <span className={styles.name}>
                {cave.name}
                {!unlocked && (
                  <span className={styles.lockHint}>
                    需{['', '', '', '', '化神期', '炼虚期', '合体期', '大乘期', '渡劫期'][cave.unlockRealm]}解锁
                  </span>
                )}
              </span>
              <span className={styles.desc}>{cave.description}</span>
              {occupant && (
                <span className={styles.bonus} data-testid={`cave-bonus-${cave.id}`}>
                  驻守：{occupant.name} · 资质 {(aptitude * 100).toFixed(0)}%
                </span>
              )}
            </div>
            {unlocked && (
              <select
                className={styles.select}
                value={occupantId ?? ''}
                onChange={(e) => assignCaveHeaven(cave.id, e.target.value || null)}
                aria-label={`${cave.name}派驻`}
              >
                <option value="">（空）</option>
                {idleCharacters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · 资质{(calcAptitude(c) * 100).toFixed(0)}%
                  </option>
                ))}
              </select>
            )}
          </div>
        )
      })}
      <CaveHeavenSummary />
    </div>
  )
}

function CaveHeavenSummary() {
  const sect = useSectStore((s) => s.sect)
  const bestRealm = sect.characters.reduce((max, c) => Math.max(max, c.realm), 0)
  const effects = aggregateCaveHeavenEffects(bestRealm, sect.caveHeavenAssignments ?? {}, sect.characters)
  const parts: string[] = []
  if (effects.cultivationMult > 0) parts.push(`修炼 +${(effects.cultivationMult * 100).toFixed(0)}%`)
  if (effects.resourceMult.herb > 0) parts.push(`灵草 +${(effects.resourceMult.herb * 100).toFixed(0)}%`)
  if (effects.resourceMult.spiritEnergy > 0)
    parts.push(`灵气 +${(effects.resourceMult.spiritEnergy * 100).toFixed(0)}%`)
  if (effects.lootMult > 0) parts.push(`掉落 +${(effects.lootMult * 100).toFixed(0)}%`)
  if (effects.offlineHours > 0) parts.push(`离线 +${effects.offlineHours.toFixed(0)}h`)
  if (effects.breakthroughBonus > 0) parts.push(`突破 +${(effects.breakthroughBonus * 100).toFixed(0)}%`)
  if (parts.length === 0) return null
  return (
    <div className={styles.summary} data-testid="cave-heaven-summary">
      洞天加成：{parts.join(' · ')}
    </div>
  )
}
