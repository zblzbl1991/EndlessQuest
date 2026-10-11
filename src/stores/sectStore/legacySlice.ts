import type { StateCreator } from 'zustand'
import type { SectStore } from './types'
import { canAscend as checkCanAscend, performAscension as doAscension } from '../../systems/sect/LegacySystem'
import { canProveDao, performDaoProving, performTranscendence, canTranscend } from '../../systems/sect/GenesisSystem'
import { getGenesisTreeNode, getGenesisNodeUpgradeCost } from '../../data/genesisTree'
import { CAVE_HEAVENS, caveHeavenSlotCount } from '../../data/caveHeavens'
import { attemptRecord } from '../../systems/sect/DaozuRecords'
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
    // V2.2 工单 05：道祖榜纪录判定
    const oldDaoYun = attemptRecord(newSect.stats, 'bestDaoYunGain', report.daoYunGain)
    const oldPeak = attemptRecord(newSect.stats, 'bestPeakCultivation', sect.stats.peakCultivationThisRun ?? 0)
    if (oldDaoYun !== null) emitEvent('milestone', `打破纪录！单世最高道韵 ${report.daoYunGain}（原 ${oldDaoYun}）`)
    if (oldPeak !== null) emitEvent('milestone', `打破纪录！单世最高修为峰值（原 ${oldPeak.toExponential(2)}）`)
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

  // ── 洞天福地派驻（V2.2 工单 04）──
  assignCaveHeaven: (caveId: string, characterId: string | null) => {
    const { sect } = get()
    const cave = CAVE_HEAVENS.find((c) => c.id === caveId)
    if (!cave) return { success: false, reason: '未知洞天' }
    const bestRealm = sect.characters.reduce((max, c) => Math.max(max, c.realm), 0)
    if (bestRealm < cave.unlockRealm)
      return { success: false, reason: `需${cave.unlockRealm >= 4 ? '化神期以上' : '更高境界'}解锁` }
    if (Object.keys(sect.caveHeavenAssignments ?? {}).length >= caveHeavenSlotCount(bestRealm) && characterId) {
      return { success: false, reason: '洞天槽位已满' }
    }
    if (characterId) {
      const character = sect.characters.find((c) => c.id === characterId)
      if (!character) return { success: false, reason: '弟子不存在' }
      if (character.status !== 'idle') return { success: false, reason: '弟子需在洞府中（idle）' }
      // 同一弟子不可重复派驻
      const assignments = { ...(sect.caveHeavenAssignments ?? {}) }
      for (const [slot, occupant] of Object.entries(assignments)) {
        if (occupant === characterId && slot !== caveId) delete assignments[slot]
      }
      set((s) => ({
        sect: { ...s.sect, caveHeavenAssignments: { ...assignments, [caveId]: characterId } },
      }))
    } else {
      set((s) => {
        const assignments = { ...(s.sect.caveHeavenAssignments ?? {}) }
        delete assignments[caveId]
        return { sect: { ...s.sect, caveHeavenAssignments: assignments } }
      })
    }
    const name = sect.characters.find((c) => c.id === characterId)?.name
    emitEvent(
      'milestone',
      characterId
        ? `洞天「${cave.name}」迎来驻守弟子${name ? `（${name}）` : ''}`
        : `洞天「${cave.name}」驻守弟子已撤出`
    )
    return { success: true, reason: '' }
  },

  // ── 证道 Prestige②（V2.1 工单 09）──
  proveDao: () => {
    const { sect } = get()
    const check = canProveDao(sect)
    if (!check.canProve) return { success: false, genesisGain: 0 }

    const { newSect, report } = performDaoProving(sect)
    // 证道次数纪录镜像
    attemptRecord(newSect.stats, 'daoProvingCount', newSect.daoProvingCount)
    set({ sect: newSect })
    emitEvent('milestone', `证道功成！大道本源 +${report.genesisGain}（累计 ${report.genesisTotal}）`)
    return { success: true, genesisGain: report.genesisGain }
  },

  transcend: () => {
    const { sect } = get()
    const check = canTranscend(sect)
    if (!check.canProve) return { success: false }
    const newSect = performTranscendence(sect)
    set({ sect: newSect })
    emitEvent('milestone', '超脱！跳出诸天之外，此界因果再不能束缚于你。')
    return { success: true }
  },

  buyGenesisNode: (nodeId: string) => {
    const { sect } = get()
    const node = getGenesisTreeNode(nodeId)
    if (!node) return false
    const level = sect.genesisTree?.[nodeId] ?? 0
    const cost = getGenesisNodeUpgradeCost(nodeId, level)
    if (cost === null) return false
    if ((sect.genesis ?? 0) < cost) return false

    set((s) => ({
      sect: {
        ...s.sect,
        genesis: (s.sect.genesis ?? 0) - cost,
        genesisTree: { ...(s.sect.genesisTree ?? {}), [nodeId]: level + 1 },
      },
    }))
    emitEvent('milestone', `本源树【${node.name}】提升至 ${level + 1} 级`)
    return true
  },
})
