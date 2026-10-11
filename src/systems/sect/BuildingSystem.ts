import type { Building, BuildingType } from '../../types/sect'
import { BUILDING_DEFS, getBuildingMaxLevel } from '../../data/buildings'
import { IMMORTAL_REALM_INDEX } from '../../data/realms'

export interface BuildingUnlockCheck {
  unlocked: boolean
  reason: string
}

export function checkBuildingUnlock(
  buildingType: BuildingType,
  buildings: Building[],
  _discipleCount?: { common: number; spirit: number; immortal: number; divine: number },
  bestRealm = 0
): BuildingUnlockCheck {
  const def = BUILDING_DEFS.find((d) => d.type === buildingType)
  if (!def) return { unlocked: false, reason: '未知建筑' }

  const building = buildings.find((b) => b.type === buildingType)
  if (building?.unlocked) return { unlocked: true, reason: '' }

  const cond = def.unlockCondition
  if (cond === '初始') return { unlocked: true, reason: '' }

  // 仙界建筑（V2.1 工单 07）：需宗门最高境界达真仙（飞升后解锁）
  if (cond === '真仙期') {
    if (bestRealm >= IMMORTAL_REALM_INDEX) return { unlocked: true, reason: '' }
    return { unlocked: false, reason: '需飞升入仙界（真仙期）' }
  }

  const parts = cond.split(/\s*\+\s*/)
  for (const part of parts) {
    const match = part.match(/(\S+)\s+Lv(\d+)/)
    if (!match) continue

    const name = match[1]
    const reqLv = parseInt(match[2], 10)
    const bDef = BUILDING_DEFS.find((d) => d.name === name || d.name.includes(name))
    const displayName = bDef?.name ?? name
    if (!bDef) continue

    const currentLv = buildings.find((b) => b.type === bDef.type)?.level ?? 0
    if (currentLv < reqLv) {
      return { unlocked: false, reason: `${displayName}需 Lv${reqLv}` }
    }
  }

  const discipleMatch = cond.match(/(.+)弟子x(\d+)/)
  if (discipleMatch && _discipleCount) {
    return { unlocked: true, reason: '弟子解锁条件将在后续阶段接入' }
  }

  return { unlocked: true, reason: '' }
}

export function canUpgradeBuilding(
  buildingType: BuildingType,
  buildings: Building[],
  spiritStone: number,
  herb?: number,
  ore?: number,
  bestRealm = 0
): {
  canUpgrade: boolean
  cost: ReturnType<(typeof import('../../data/buildings').BUILDING_DEFS)[0]['upgradeCost']>
  reason: string
} {
  const building = buildings.find((b) => b.type === buildingType)
  if (!building || !building.unlocked) return { canUpgrade: false, cost: { spiritStone: 0 }, reason: '未解锁' }

  const def = BUILDING_DEFS.find((d) => d.type === buildingType)
  if (!def || building.level >= getBuildingMaxLevel(buildingType, bestRealm)) {
    return { canUpgrade: false, cost: { spiritStone: 0 }, reason: '已满级' }
  }

  const cost = def.upgradeCost(building.level)
  if (spiritStone < cost.spiritStone) return { canUpgrade: false, cost, reason: '灵石不足' }

  const herbCost = cost.herb ?? 0
  const oreCost = cost.ore ?? 0
  if (herbCost > 0 && (herb ?? 0) < herbCost) return { canUpgrade: false, cost, reason: '灵草不足' }
  if (oreCost > 0 && (ore ?? 0) < oreCost) return { canUpgrade: false, cost, reason: '矿材不足' }

  return { canUpgrade: true, cost, reason: '' }
}
