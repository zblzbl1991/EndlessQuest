import type { StateCreator } from 'zustand'
import type { SectStore } from './types'
import type { SectPath } from '../../types/sect'
import { SECT_PATHS } from '../../data/sectPaths'
import { canUnlockNode, getPathNode } from '../../systems/sect/SectPathSystem'
import { getActiveRoute } from '../../systems/sect/SectRouteSystem'
import type { SectRouteId } from '../../data/sectRoutes'

export const createSectPathSlice: StateCreator<SectStore, [], [], Partial<SectStore>> = (set, get) => ({
  chooseSectPath: (path: SectPath) => {
    set((s) => ({
      sect: {
        ...s.sect,
        sectPath: path,
        unlockedPathNodeIds: [],
        pathUnlockedAt: Date.now(),
      },
    }))
  },

  unlockPathNode: (nodeId: string) => {
    const { sect } = get()
    const check = canUnlockNode(sect, nodeId)
    if (!check.ok) return false
    const node = getPathNode(sect.sectPath, nodeId)
    if (!node) return false
    set((s) => ({
      sect: {
        ...s.sect,
        resources: {
          ...s.sect.resources,
          spiritStone: s.sect.resources.spiritStone - node.cost.spiritStone,
          herb: s.sect.resources.herb - (node.cost.herb ?? 0),
          ore: s.sect.resources.ore - (node.cost.ore ?? 0),
        },
        unlockedPathNodeIds: [...s.sect.unlockedPathNodeIds, nodeId],
      },
    }))
    return true
  },

  resetSectPath: () => {
    const { sect } = get()
    if (sect.sectPath === 'none') return
    const pathDef = SECT_PATHS[sect.sectPath]
    const cost = pathDef?.resetCost ?? 0
    if (sect.resources.spiritStone < cost) return
    set((s) => ({
      sect: {
        ...s.sect,
        resources: { ...s.sect.resources, spiritStone: s.sect.resources.spiritStone - cost },
        sectPath: 'none' as const,
        unlockedPathNodeIds: [],
        pathUnlockedAt: null,
      },
    }))
  },

  setActiveRoute: (routeId: SectRouteId | null) => {
    set((s) => ({
      sect: {
        ...s.sect,
        activeRoute: routeId,
      },
    }))
  },

  getActiveRouteEffects: () => {
    return getActiveRoute(get().sect.activeRoute)
  },
})
