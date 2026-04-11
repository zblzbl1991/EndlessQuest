import type { StateCreator } from 'zustand'
import type { SectStore } from './types'
import { canAscend as checkCanAscend, performAscension as doAscension } from '../../systems/sect/LegacySystem'
import { buildTechniqueUnlockMessage } from '../../data/legacyFlavor'
import { emitEvent } from '../eventLogStore'

export const createLegacySlice: StateCreator<SectStore, [], [], Partial<SectStore>> = (set, get) => ({
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
