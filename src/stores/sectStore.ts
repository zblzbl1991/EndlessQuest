import { create } from 'zustand'
import type { Building, BuildingType, Resources } from '../types'
import { BUILDING_DEFS } from '../data/buildings'
import { checkBuildingUnlock, canUpgradeBuilding } from '../systems/sect/BuildingSystem'

// TODO: Remove all disciple-related code after Task 11 (SectStore rewrite)

interface SectState {
  buildings: Building[]
  resources: Resources
  upgradeBuilding: (type: BuildingType) => boolean
  unlockBuilding: (type: BuildingType) => boolean
  tryUpgradeBuilding: (type: BuildingType) => { success: boolean; reason: string }
  reset: () => void
}

function createInitialBuildings(): Building[] {
  return BUILDING_DEFS.map((def) => ({
    type: def.type,
    level: def.type === 'mainHall' ? 1 : 0,
    unlocked: def.type === 'mainHall',
  }))
}

const initialResources: Resources = {
  spiritStone: 500, spiritEnergy: 0, herb: 0, ore: 0,
  fairyJade: 0, scrollFragment: 0, heavenlyTreasure: 0, beastSoul: 0,
}

export const useSectStore = create<SectState>((set, get) => ({
  buildings: createInitialBuildings(),
  resources: { ...initialResources },
  upgradeBuilding: (type) => {
    const building = get().buildings.find((b) => b.type === type)
    if (!building || !building.unlocked) return false
    const def = BUILDING_DEFS.find((d) => d.type === type)
    if (!def || building.level >= def.maxLevel) return false
    const cost = def.upgradeCost(building.level)
    if (get().resources.spiritStone < cost.spiritStone) return false
    set((s) => ({
      buildings: s.buildings.map((b) => b.type === type ? { ...b, level: b.level + 1 } : b),
      resources: { ...s.resources, spiritStone: s.resources.spiritStone - cost.spiritStone },
    }))
    return true
  },
  unlockBuilding: (type) => {
    const { buildings } = get()
    const check = checkBuildingUnlock(type, buildings)
    if (!check.unlocked) return false
    set((s) => ({
      buildings: s.buildings.map(b => b.type === type ? { ...b, unlocked: true } : b),
    }))
    return true
  },
  tryUpgradeBuilding: (type) => {
    const { buildings, resources } = get()
    // Check unlock first
    const building = buildings.find(b => b.type === type)
    if (!building?.unlocked) {
      const unlockCheck = checkBuildingUnlock(type, buildings)
      if (!unlockCheck.unlocked) return { success: false, reason: unlockCheck.reason }
      // Try to unlock
      const unlocked = get().unlockBuilding(type)
      if (!unlocked) return { success: false, reason: unlockCheck.reason }
    }
    // Check upgrade feasibility
    const check = canUpgradeBuilding(type, get().buildings, resources.spiritStone)
    if (!check.canUpgrade) return { success: false, reason: check.reason }
    // Perform upgrade
    const success = get().upgradeBuilding(type)
    return { success, reason: '' }
  },
  reset: () => set({
    buildings: createInitialBuildings(),
    resources: { ...initialResources },
  }),
}))
