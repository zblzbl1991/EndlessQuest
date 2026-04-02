import type { StateCreator } from 'zustand'
import type { SectStore } from './types'
import type { BuildingType } from '../../types'
import type { Character } from '../../types/character'
import { BUILDING_DEFS, getBuildingExpandCost, getBuildingNodeCap, isResourceNode } from '../../data/buildings'
import { SPECIALTY_BUILDING_MAP } from '../../data/specialties'
import { checkBuildingUnlock, canUpgradeBuilding } from '../../systems/sect/BuildingSystem'
import { emitEvent } from '../eventLogStore'
import { canStartRecipe } from '../../systems/building/ProductionSystem'
import { getRecommendedAssignment } from '../../systems/character/SpecialtySystem'
import { CHAR_QUALITY_ORDER } from '../../data/uiCopy'

function getQualityRank(quality: Character['quality']): number {
  return CHAR_QUALITY_ORDER.indexOf(quality)
}

function getBuildingAssignmentScore(character: Character, buildingType: string): number {
  let score = 0
  for (const specialty of character.specialties) {
    if (SPECIALTY_BUILDING_MAP[specialty.type] === buildingType) {
      score = Math.max(score, specialty.level * 10)
    }
  }
  return score
}

function getRecommendedBuildingCandidates(
  characters: Character[],
  buildingType: string,
  availableSlots: number
): Character[] {
  if (availableSlots <= 0) return []

  return characters
    .filter((character) => character.status === 'idle' && getRecommendedAssignment(character) === buildingType)
    .sort((a, b) => {
      const scoreDiff = getBuildingAssignmentScore(b, buildingType) - getBuildingAssignmentScore(a, buildingType)
      if (scoreDiff !== 0) return scoreDiff

      const qualityDiff = getQualityRank(b.quality) - getQualityRank(a.quality)
      if (qualityDiff !== 0) return qualityDiff

      return b.totalCultivation - a.totalCultivation
    })
    .slice(0, availableSlots)
}

function buildAutoAssignmentResult(
  characters: Character[],
  buildingType: string
): { characters: Character[]; assigned: number } {
  const assignedCount = characters.filter((character) => character.assignedBuilding === buildingType).length
  const availableSlots = Math.max(0, 3 - assignedCount)
  const candidates = getRecommendedBuildingCandidates(characters, buildingType, availableSlots)

  if (candidates.length === 0) {
    return { characters, assigned: 0 }
  }

  const candidateIds = new Set(candidates.map((character) => character.id))
  let assigned = 0

  return {
    characters: characters.map((character) => {
      if (!candidateIds.has(character.id)) return character
      assigned += 1
      return {
        ...character,
        status: 'training' as const,
        assignedBuilding: buildingType,
      }
    }),
    assigned,
  }
}

export const createBuildingSlice: StateCreator<SectStore, [], [], Partial<SectStore>> = (set, get) => ({
  upgradeBuilding: (type: BuildingType) => {
    const { sect } = get()
    const building = sect.buildings.find((b) => b.type === type)
    if (!building || !building.unlocked) return false

    const def = BUILDING_DEFS.find((d) => d.type === type)
    if (!def || building.level >= def.maxLevel) return false

    const cost = def.upgradeCost(building.level)
    if (sect.resources.spiritStone < cost.spiritStone) return false

    set((s) => ({
      sect: {
        ...s.sect,
        buildings: s.sect.buildings.map((b) =>
          b.type === type ? { ...b, level: b.level + 1, count: Math.max(1, b.count ?? 0) } : b
        ),
        resources: {
          ...s.sect.resources,
          spiritStone: s.sect.resources.spiritStone - cost.spiritStone,
        },
        stats: {
          ...s.sect.stats,
          totalBuildingUpgrades: s.sect.stats.totalBuildingUpgrades + 1,
          totalSpiritStoneSpent: s.sect.stats.totalSpiritStoneSpent + cost.spiritStone,
        },
      },
    }))

    return true
  },

  expandBuilding: (type: BuildingType) => {
    const { sect } = get()
    const building = sect.buildings.find((b) => b.type === type)
    const mainHallLevel = sect.buildings.find((b) => b.type === 'mainHall')?.level ?? 1

    if (!building || !building.unlocked || !isResourceNode(type) || building.level <= 0) return false
    if ((building.count ?? 0) >= getBuildingNodeCap(mainHallLevel)) return false

    const cost = getBuildingExpandCost(type, building.count ?? 0)
    if (sect.resources.spiritStone < cost.spiritStone) return false

    set((s) => ({
      sect: {
        ...s.sect,
        buildings: s.sect.buildings.map((b) => (b.type === type ? { ...b, count: (b.count ?? 0) + 1 } : b)),
        resources: {
          ...s.sect.resources,
          spiritStone: s.sect.resources.spiritStone - cost.spiritStone,
        },
        stats: {
          ...s.sect.stats,
          totalBuildingUpgrades: s.sect.stats.totalBuildingUpgrades + 1,
          totalSpiritStoneSpent: s.sect.stats.totalSpiritStoneSpent + cost.spiritStone,
        },
      },
    }))

    return true
  },

  tryUpgradeBuilding: (type: BuildingType) => {
    const { sect } = get()
    const bDef = BUILDING_DEFS.find((d) => d.type === type)
    const isNewBuilding = !sect.buildings.find((b) => b.type === type)?.unlocked

    const building = sect.buildings.find((b) => b.type === type)
    if (!building?.unlocked) {
      const unlockCheck = checkBuildingUnlock(type, sect.buildings)
      if (!unlockCheck.unlocked) return { success: false, reason: unlockCheck.reason }

      set((s) => ({
        sect: {
          ...s.sect,
          buildings: s.sect.buildings.map((b) => (b.type === type ? { ...b, unlocked: true } : b)),
        },
      }))
    }

    const check = canUpgradeBuilding(type, get().sect.buildings, get().sect.resources.spiritStone)
    if (!check.canUpgrade) return { success: false, reason: check.reason }

    const success = get().upgradeBuilding(type)
    if (success) {
      const newLevel = get().sect.buildings.find((b) => b.type === type)?.level ?? 0
      if (isNewBuilding) {
        emitEvent('building_build', `瀵ゆ椽鈧?${bDef?.name ?? type}`)
      } else {
        emitEvent('building_upgrade', `${bDef?.name ?? type} 閸楀洨楠囬懛?Lv${newLevel}`)
      }
    }

    return { success, reason: '' }
  },

  tryExpandBuilding: (type: BuildingType) => {
    const { sect } = get()
    const building = sect.buildings.find((b) => b.type === type)
    const def = BUILDING_DEFS.find((d) => d.type === type)
    const mainHallLevel = sect.buildings.find((b) => b.type === 'mainHall')?.level ?? 1

    if (!building?.unlocked || building.level <= 0) return { success: false, reason: '建筑尚未启用' }
    if (!def?.expandable || !isResourceNode(type)) return { success: false, reason: '当前建筑不可扩建' }

    const nodeCap = getBuildingNodeCap(mainHallLevel)
    if ((building.count ?? 0) >= nodeCap) return { success: false, reason: `主殿当前仅容纳 ${nodeCap} 座` }

    const cost = getBuildingExpandCost(type, building.count ?? 0)
    if (sect.resources.spiritStone < cost.spiritStone) return { success: false, reason: '灵石不足' }

    const success = get().expandBuilding(type)
    if (success) {
      const nextCount = get().sect.buildings.find((b) => b.type === type)?.count ?? building.count
      emitEvent('building_upgrade', `${def.name} 扩建至 ${nextCount} 座`)
    }

    return { success, reason: '' }
  },

  setProductionRecipe: (buildingType: BuildingType, recipeId: string | null) => {
    const { sect } = get()
    const building = sect.buildings.find((b) => b.type === buildingType)
    if (!building || !building.unlocked) return
    if (recipeId !== null && !canStartRecipe(recipeId, building.level)) return

    set((state) => ({
      sect: {
        ...state.sect,
        buildings: state.sect.buildings.map((b) =>
          b.type === buildingType ? { ...b, productionQueue: { recipeId, progress: 0 } } : b
        ),
      },
    }))
  },

  assignToBuilding: (characterId: string, buildingType: string) => {
    set((s) => {
      const character = s.sect.characters.find((c) => c.id === characterId)
      if (!character) return s
      if (character.status !== 'idle') return s

      const assigned = s.sect.characters.filter((c) => c.assignedBuilding === buildingType)
      if (assigned.length >= 3) return s

      return {
        sect: {
          ...s.sect,
          characters: s.sect.characters.map((c) =>
            c.id === characterId ? { ...c, status: 'training' as const, assignedBuilding: buildingType } : c
          ),
        },
      }
    })
  },

  autoAssignToBuilding: (buildingType: string) => {
    const { sect } = get()
    const building = sect.buildings.find((b) => b.type === buildingType)
    if (!building?.unlocked || building.level <= 0) {
      return { success: false, assigned: 0, reason: '寤虹瓚灏氭湭鍙敤' }
    }

    const result = buildAutoAssignmentResult(sect.characters, buildingType)
    if (result.assigned === 0) {
      return { success: false, assigned: 0, reason: '褰撳墠娌℃湁鍚堥€傜殑绌洪棽寮熷瓙' }
    }


    set((s) => ({
      sect: {
        ...s.sect,
        characters: result.characters,
      },
    }))

    emitEvent('milestone', 'auto-assigned disciples to building')

    return { success: true, assigned: result.assigned, reason: '' }
  },

  autoOptimizeBuildingAssignments: () => {
    const { sect } = get()
    const assignableBuildings = sect.buildings.filter((building) => {
      if (!building.unlocked || building.level <= 0) return false
      return Object.values(SPECIALTY_BUILDING_MAP).includes(building.type)
    })

    if (assignableBuildings.length === 0) {
      return { success: false, assigned: 0, reason: '褰撳墠娌℃湁鍙嚜鍔ㄦ淳椹荤殑寤虹瓚' }
    }

    let characters = sect.characters
    let assigned = 0

    for (const building of assignableBuildings) {
      const result = buildAutoAssignmentResult(characters, building.type)
      if (result.assigned > 0) {
        characters = result.characters
        assigned += result.assigned
      }
    }

    if (assigned === 0) {
      return { success: false, assigned: 0, reason: '褰撳墠娌℃湁鍚堥€傜殑绌洪棽寮熷瓙' }
    }

    set((s) => ({
      sect: {
        ...s.sect,
        characters,
      },
    }))

    emitEvent('milestone', 'sect auto-optimized assignments')

    return { success: true, assigned, reason: '' }
  },

  unassignFromBuilding: (characterId: string) => {
    set((s) => {
      const character = s.sect.characters.find((c) => c.id === characterId)
      if (!character) return s
      if (character.status !== 'training' || !character.assignedBuilding) return s

      return {
        sect: {
          ...s.sect,
          characters: s.sect.characters.map((c) =>
            c.id === characterId ? { ...c, status: 'idle' as const, assignedBuilding: null } : c
          ),
        },
      }
    })
  },
})
