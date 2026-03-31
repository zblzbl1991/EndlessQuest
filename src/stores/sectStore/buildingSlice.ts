import type { StateCreator } from 'zustand'
import type { SectStore } from './types'
import type { BuildingType } from '../../types'
import { BUILDING_DEFS } from '../../data/buildings'
import { checkBuildingUnlock, canUpgradeBuilding } from '../../systems/sect/BuildingSystem'
import { emitEvent } from '../eventLogStore'
import { canStartRecipe } from '../../systems/building/ProductionSystem'

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
        buildings: s.sect.buildings.map((b) => (b.type === type ? { ...b, level: b.level + 1 } : b)),
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

    // Check unlock first
    const building = sect.buildings.find((b) => b.type === type)
    if (!building?.unlocked) {
      const unlockCheck = checkBuildingUnlock(type, sect.buildings)
      if (!unlockCheck.unlocked) return { success: false, reason: unlockCheck.reason }
      // Unlock the building (no event yet — emit after upgrade to avoid duplicate)
      set((s) => ({
        sect: {
          ...s.sect,
          buildings: s.sect.buildings.map((b) => (b.type === type ? { ...b, unlocked: true } : b)),
        },
      }))
    }

    // Check upgrade feasibility
    const check = canUpgradeBuilding(type, get().sect.buildings, get().sect.resources.spiritStone)
    if (!check.canUpgrade) return { success: false, reason: check.reason }

    // Perform upgrade
    const success = get().upgradeBuilding(type)
    if (success) {
      const newLevel = get().sect.buildings.find((b) => b.type === type)?.level ?? 0
      if (isNewBuilding) {
        emitEvent('building_build', `建造 ${bDef?.name ?? type}`)
      } else {
        emitEvent('building_upgrade', `${bDef?.name ?? type} 升级至 Lv${newLevel}`)
      }
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
