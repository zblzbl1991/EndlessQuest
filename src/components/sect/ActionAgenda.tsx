import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSectStore } from '../../stores/sectStore'
import { useAdventureStore } from '../../stores/adventureStore'
import { canBreakthrough } from '../../systems/cultivation/CultivationEngine'
import { getCultivationNeeded, getMinorBreakthroughCost, REALMS, BREAKTHROUGH_COSTS } from '../../data/realms'
import { canUpgradeBuilding } from '../../systems/sect/BuildingSystem'
import { BUILDING_DEFS, calcResourceCaps } from '../../data/buildings'
import { needsCultivationPathChoice } from '../../systems/character/CultivationPathSystem'
import { DUNGEONS } from '../../data/events'
import styles from './ActionAgenda.module.css'

interface AgendaItem {
  id: string
  priority: number
  label: string
  detail: string
  link: string
}

export default function ActionAgenda() {
  const navigate = useNavigate()
  const sect = useSectStore((s) => s.sect)
  const reports = useAdventureStore((s) => s.reports)

  const items = useMemo(() => {
    const result: AgendaItem[] = []

    for (const char of sect.characters) {
      const needed = getCultivationNeeded(char.realm, char.realmStage)
      if (needed === Infinity) continue

      const progress = char.cultivation / needed
      if (progress <= 0.9 || !canBreakthrough(char)) continue

      const realmDef = REALMS[char.realm]
      const isMajor = char.realmStage >= (realmDef?.stages.length ?? 4) - 1
      const cost = isMajor
        ? (BREAKTHROUGH_COSTS[char.realm + 1]?.spiritStone ?? 0)
        : getMinorBreakthroughCost(char.realm, char.realmStage)
      const pathChoiceNeeded = needsCultivationPathChoice(char)

      result.push({
        id: `breakthrough-${char.id}`,
        priority: pathChoiceNeeded ? 0 : 1,
        label: pathChoiceNeeded ? `${char.name} 待定修行路线` : `${char.name} 即将突破`,
        detail: pathChoiceNeeded ? '先选定剑、体、丹等方向，再继续自动突破。' : `需要 ${cost.toLocaleString()} 灵石`,
        link: '/characters',
      })
    }

    for (const bDef of BUILDING_DEFS) {
      const building = sect.buildings.find((b) => b.type === bDef.type)
      if (!building || !building.unlocked) continue

      const check = canUpgradeBuilding(bDef.type, sect.buildings, sect.resources.spiritStone)
      if (!check.canUpgrade) continue

      result.push({
        id: `building-${bDef.type}`,
        priority: 2,
        label: `${bDef.name} 可升级`,
        detail: `升级到 ${building.level + 1} 级`,
        link: '/buildings',
      })
    }

    const idleChars = sect.characters.filter((c) => c.status === 'idle').length
    for (const dungeon of DUNGEONS) {
      const isUnlocked = sect.characters.some(
        (c) => c.realm > dungeon.unlockRealm || (c.realm === dungeon.unlockRealm && c.realmStage >= dungeon.unlockStage)
      )
      if (!isUnlocked || idleChars <= 0) continue

      result.push({
        id: `dungeon-${dungeon.id}`,
        priority: 3,
        label: `${dungeon.name} 已解锁`,
        detail: `可派遣 ${Math.min(idleChars, 5)} 名弟子探险`,
        link: '/adventure',
      })
      break
    }

    for (const char of sect.characters) {
      if (char.status !== 'injured') continue

      result.push({
        id: `injured-${char.id}`,
        priority: 4,
        label: `${char.name} 正在疗伤`,
        detail: `剩余 ${Math.ceil(char.injuryTimer)}s`,
        link: '/characters',
      })
    }

    const caps = calcResourceCaps(
      sect.buildings.find((b) => b.type === 'spiritField')?.level ?? 0,
      sect.buildings.find((b) => b.type === 'spiritMine')?.level ?? 0
    )
    const resourceChecks = [
      { name: '灵气', value: sect.resources.spiritEnergy, cap: caps.spiritEnergy },
      { name: '灵草', value: sect.resources.herb, cap: caps.herb },
      { name: '矿材', value: sect.resources.ore, cap: caps.ore },
    ]
    for (const rc of resourceChecks) {
      if (rc.cap > 0 && rc.value / rc.cap > 0.8) {
        result.push({
          id: `overflow-${rc.name}`,
          priority: 5,
          label: `${rc.name} 即将溢出`,
          detail: `${Math.floor(rc.value)}/${rc.cap}`,
          link: '/buildings',
        })
      }
    }

    for (const report of reports.slice(0, 1)) {
      const dungeon = DUNGEONS.find((d) => d.id === report.dungeonId)
      result.push({
        id: `report-${report.id}`,
        priority: 6,
        label: `最近完成 ${dungeon?.name ?? '秘境'}`,
        detail: `${report.result === 'completed' ? '通关' : report.result === 'retreated' ? '撤退' : '失败'} · 第${
          report.floorsCleared
        } 层`,
        link: `/adventure/report/${report.id}`,
      })
    }

    return result.sort((a, b) => a.priority - b.priority).slice(0, 3)
  }, [reports, sect])

  if (items.length === 0) return null

  return (
    <div className={styles.container}>
      <div className={styles.title}>淇瑕佸姟</div>
      <div className={styles.cards}>
        {items.map((item) => (
          <button key={item.id} className={styles.card} onClick={() => navigate(item.link)}>
            <div className={styles.cardLabel}>{item.label}</div>
            <div className={styles.cardDetail}>{item.detail}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
