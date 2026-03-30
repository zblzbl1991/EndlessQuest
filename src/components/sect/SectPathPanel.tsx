import { useSectStore } from '../../stores/sectStore'
import { SECT_PATHS, canUnlockSectPath, getNextNode } from '../../data/sectPaths'
import { canUnlockNode } from '../../systems/sect/SectPathSystem'
import type { SectPath } from '../../types/sect'
import styles from './SectPathPanel.module.css'

export default function SectPathPanel() {
  const sect = useSectStore((s) => s.sect)
  const chooseSectPath = useSectStore((s) => s.chooseSectPath)
  const unlockPathNode = useSectStore((s) => s.unlockPathNode)
  const resetSectPath = useSectStore((s) => s.resetSectPath)

  const canUnlock = canUnlockSectPath(sect.level, sect.characters.length)
  const pathDef = sect.sectPath !== 'none' ? SECT_PATHS[sect.sectPath] : null

  // Not yet eligible
  if (!canUnlock && sect.sectPath === 'none') {
    return (
      <div className={styles.container}>
        <div className={styles.title}>宗门路线</div>
        <div className={styles.lockedHint}>宗门等级 5 级且弟子满 10 人后可解锁宗门路线</div>
      </div>
    )
  }

  // Choose path
  if (sect.sectPath === 'none') {
    const pathIds: Exclude<SectPath, 'none'>[] = ['pill', 'sword', 'beast']
    return (
      <div className={styles.container}>
        <div className={styles.title}>选择宗门路线</div>
        <div className={styles.pathCards}>
          {pathIds.map((pid) => {
            const def = SECT_PATHS[pid]
            return (
              <button key={pid} className={styles.pathCard} onClick={() => chooseSectPath(pid)}>
                <div className={styles.pathCardName}>{def.name}</div>
                <div className={styles.pathCardDesc}>{def.description}</div>
                <div className={styles.pathCardReq}>
                  共 {def.nodes.length} 阶 · 重置消耗 {def.resetCost.toLocaleString()} 灵石
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Active path view
  if (!pathDef) return null

  const nextNode = getNextNode(sect.sectPath, sect.unlockedPathNodeIds)
  const resetCost = pathDef.resetCost

  return (
    <div className={styles.container}>
      <div className={styles.title}>宗门路线</div>
      <div className={styles.activePath}>
        <div className={styles.activeHeader}>
          <div>
            <div className={styles.activePathName}>{pathDef.name}</div>
            <div className={styles.activePathDesc}>{pathDef.description}</div>
          </div>
          <button
            className={styles.resetBtn}
            onClick={() => resetSectPath()}
            disabled={sect.resources.spiritStone < resetCost}
          >
            重置 ({resetCost.toLocaleString()} 灵石)
          </button>
        </div>

        <div className={styles.nodeList}>
          {pathDef.nodes.map((node) => {
            const isUnlocked = sect.unlockedPathNodeIds.includes(node.id)
            const isNext = nextNode?.id === node.id
            const check = isNext ? canUnlockNode(sect, node.id) : null
            const canAfford = check?.ok ?? false

            let dotClass = styles.nodeDot
            if (isUnlocked) dotClass += ` ${styles.nodeDotUnlocked}`
            else if (isNext) dotClass += ` ${styles.nodeDotNext}`

            let nameClass = styles.nodeName
            if (!isUnlocked && !isNext) nameClass += ` ${styles.nodeNameLocked}`

            let descClass = styles.nodeDesc
            if (!isUnlocked && !isNext) descClass += ` ${styles.nodeDescLocked}`

            return (
              <div key={node.id} className={styles.nodeItem}>
                <div className={dotClass}>{node.order}</div>
                <div className={styles.nodeInfo}>
                  <div className={nameClass}>{node.name}</div>
                  <div className={descClass}>{node.description}</div>
                  {isNext && (
                    <div className={`${styles.costText} ${!canAfford ? styles.costInsufficient : ''}`}>
                      灵石 {node.cost.spiritStone.toLocaleString()}
                      {node.cost.herb ? ` · 灵草 ${node.cost.herb.toLocaleString()}` : ''}
                      {node.cost.ore ? ` · 矿石 ${node.cost.ore.toLocaleString()}` : ''}
                    </div>
                  )}
                </div>
                {isNext && (
                  <button className={styles.unlockBtn} disabled={!canAfford} onClick={() => unlockPathNode(node.id)}>
                    解锁
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
