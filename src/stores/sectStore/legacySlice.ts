import type { StateCreator } from 'zustand'
import type { SectStore } from './types'
import { canAscend as checkCanAscend, performAscension as doAscension } from '../../systems/sect/LegacySystem'
import { buildTechniqueUnlockMessage } from '../../data/legacyFlavor'
import { getLegacyTreeNode } from '../../data/legacyTree'
import { emitEvent } from '../eventLogStore'

export const createLegacySlice: StateCreator<SectStore, [], [], Partial<SectStore>> = (set, get) => ({
  buyLegacyNode: (nodeId: string) => {
    const { sect } = get()
    const node = getLegacyTreeNode(nodeId)
    if (!node) return false
    const level = sect.legacyTree[nodeId] ?? 0
    if (level >= node.maxLevel) return false
    const cost = node.baseCost * 2 ** level
    if (sect.legacy.daoYun < cost) return false

    set((s) => ({
      sect: {
        ...s.sect,
        legacy: { ...s.sect.legacy, daoYun: s.sect.legacy.daoYun - cost },
        legacyTree: { ...s.sect.legacyTree, [nodeId]: level + 1 },
      },
    }))
    emitEvent('milestone', `飞升树【${node.name}】提升至 ${level + 1} 级`)
    return true
  },

  performAscension: () => {
    const { sect } = get()
    const check = checkCanAscend(sect)
    if (!check.canAscend) return

    const { newSect, report } = doAscension(sect)
    set({ sect: newSect })

    for (const techniqueId of report.unlockedTechniques) {
      emitEvent('technique_unlocked', buildTechniqueUnlockMessage(techniqueId, techniqueId, 'ascension'), {
        techniqueId,
        legacyTechniqueId: techniqueId,
      })
    }

    if (report.unlockedDungeons.length > 0) {
      emitEvent(
        'milestone',
        `杞洖鍚庡北闂ㄩ噸鏂板畾浣嶏紝鏂扮殑闅愪笘绉樺宸插紑鏀?${report.unlockedDungeons.length} 澶?`,
        {
          legacyDungeonIds: report.unlockedDungeons,
          isLegacyEncounter: true,
        }
      )
    }
  },
})
