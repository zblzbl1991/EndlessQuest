import { create } from 'zustand'
import type { Building, BuildingType, Disciple, DiscipleQuality, Resources } from '../types'
import { BUILDING_DEFS } from '../data/buildings'
import { checkBuildingUnlock, canUpgradeBuilding } from '../systems/sect/BuildingSystem'
import { recruitDisciple as recruitDiscipleFn, trainDisciple as trainDiscipleFn } from '../systems/disciple/DiscipleEngine'

interface SectState {
  buildings: Building[]
  disciples: Disciple[]
  resources: Resources
  discipleMaxOwned: Record<DiscipleQuality, number>
  upgradeBuilding: (type: BuildingType) => boolean
  unlockBuilding: (type: BuildingType) => boolean
  tryUpgradeBuilding: (type: BuildingType) => { success: boolean; reason: string }
  recruitDisciple: () => { success: boolean; disciple: Disciple | null }
  trainDisciples: (deltaSec: number) => void
  healDisciple: (id: string) => boolean
  updateMaxOwned: () => void
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
  recruitDisciple: () => {
    const { disciples } = get()
    if (disciples.length >= 12) return { success: false, disciple: null }

    // Determine max quality based on recruitmentPavilion level
    const pavilionLevel = get().buildings.find(b => b.type === 'recruitmentPavilion')?.level ?? 0
    const maxQuality: DiscipleQuality = pavilionLevel >= 4 ? 'divine' : pavilionLevel >= 3 ? 'immortal' : pavilionLevel >= 2 ? 'spirit' : 'common'

    const result = recruitDiscipleFn(maxQuality)
    if (result.success && result.disciple) {
      set((s) => {
        const newDisciples = [...s.disciples, result.disciple!]
        // Update max owned tracking
        const quality = result.disciple!.quality
        const currentMax = s.discipleMaxOwned[quality as keyof typeof s.discipleMaxOwned] ?? 0
        const currentCount = newDisciples.filter(d => d.quality === quality).length
        const newMaxOwned = { ...s.discipleMaxOwned }
        if (currentCount > currentMax) {
          newMaxOwned[quality] = currentCount
        }
        return { disciples: newDisciples, discipleMaxOwned: newMaxOwned }
      })
    }
    return result
  },
  trainDisciples: (deltaSec) => {
    set((s) => ({
      disciples: s.disciples.map(d => d.status === 'active' ? trainDiscipleFn(d, deltaSec) : d),
    }))
  },
  healDisciple: (id) => {
    const disciple = get().disciples.find(d => d.id === id)
    if (!disciple || disciple.status !== 'wounded') return false
    set((s) => ({
      disciples: s.disciples.map(d => d.id === id ? { ...d, status: 'active' as const } : d),
    }))
    return true
  },
  updateMaxOwned: () => {
    const { disciples, discipleMaxOwned } = get()
    const newMax = { ...discipleMaxOwned }
    for (const d of disciples) {
      const q = d.quality as keyof typeof newMax
      const count = disciples.filter(dd => dd.quality === d.quality).length
      if (count > (newMax[q] ?? 0)) newMax[q] = count
    }
    set({ discipleMaxOwned: newMax })
  },
  reset: () => set({
    buildings: createInitialBuildings(),
    disciples: [],
    resources: { ...initialResources },
    discipleMaxOwned: { common: 0, spirit: 0, immortal: 0, divine: 0 },
  }),
}))
