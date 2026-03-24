import { create } from 'zustand'
import type { Building, BuildingType, Disciple, Resources } from '../types'
import { BUILDING_DEFS } from '../data/buildings'

interface SectState {
  buildings: Building[]
  disciples: Disciple[]
  resources: Resources
  discipleMaxOwned: Record<string, number>
  upgradeBuilding: (type: BuildingType) => boolean
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
  disciples: [],
  resources: { ...initialResources },
  discipleMaxOwned: { common: 0, spirit: 0, immortal: 0, divine: 0 },
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
  reset: () => set({
    buildings: createInitialBuildings(),
    disciples: [],
    resources: { ...initialResources },
    discipleMaxOwned: { common: 0, spirit: 0, immortal: 0, divine: 0 },
  }),
}))
