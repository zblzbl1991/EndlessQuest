// src/systems/sect/BuildingSystem.ts

import type { Building, BuildingType } from '../../types/sect'
import { BUILDING_DEFS } from '../../data/buildings'

export interface BuildingUnlockCheck {
  unlocked: boolean
  reason: string
}

export function checkBuildingUnlock(
  buildingType: BuildingType,
  buildings: Building[],
  _discipleCount?: { common: number; spirit: number; immortal: number; divine: number }
): BuildingUnlockCheck {
  const def = BUILDING_DEFS.find(d => d.type === buildingType)
  if (!def) return { unlocked: false, reason: '未知建筑' }

  const building = buildings.find(b => b.type === buildingType)
  if (building?.unlocked) return { unlocked: true, reason: '' }

  const cond = def.unlockCondition

  if (cond === '初始') return { unlocked: true, reason: '' }

  // Split by '+' to get individual requirements
  const parts = cond.split(/\s*\+\s*/)

  for (const part of parts) {
    const match = part.match(/(\S+)\s+Lv(\d+)/)
    if (!match) continue

    const name = match[1]
    const reqLv = parseInt(match[2])
    // Match by full name or substring (unlockCondition uses short names like "大殿")
    const bDef = BUILDING_DEFS.find(d => d.name === name || d.name.includes(name))
    const displayName = bDef?.name ?? name
    if (bDef) {
      const currentLv = buildings.find(b => b.type === bDef.type)?.level ?? 0
      if (currentLv < reqLv) {
        return { unlocked: false, reason: `${displayName}需 Lv${reqLv}` }
      }
    }
  }

  // Check disciple requirements (Phase 6 will enforce these)
  const discipleMatch = cond.match(/(.+品)弟子×(\d+)/)
  if (discipleMatch && _discipleCount) {
    return { unlocked: true, reason: '需要弟子解锁（Phase 6）' }
  }

  return { unlocked: true, reason: '' }
}

export function canUpgradeBuilding(
  buildingType: BuildingType,
  buildings: Building[],
  spiritStone: number
): { canUpgrade: boolean; cost: { spiritStone: number }; reason: string } {
  const building = buildings.find(b => b.type === buildingType)
  if (!building || !building.unlocked) return { canUpgrade: false, cost: { spiritStone: 0 }, reason: '未解锁' }

  const def = BUILDING_DEFS.find(d => d.type === buildingType)
  if (!def || building.level >= def.maxLevel) return { canUpgrade: false, cost: { spiritStone: 0 }, reason: '已满级' }

  const cost = def.upgradeCost(building.level)
  if (spiritStone < cost.spiritStone) return { canUpgrade: false, cost, reason: '灵石不足' }

  return { canUpgrade: true, cost, reason: '' }
}
