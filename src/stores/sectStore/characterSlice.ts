import type { StateCreator } from 'zustand'
import type { SectStore } from './types'
import type { CharacterQuality, CultivationPath } from '../../types/character'
import {
  generateCharacter,
  getMaxCharacters,
  getRecruitCost,
  isQualityUnlocked,
} from '../../systems/character/CharacterEngine'
import { calcDiscipleDeathRefund } from '../../systems/character/DiscipleSacrificeSystem'
import { getRecruitCostMult } from '../../systems/economy/BuildingEffects'
import { emitEvent } from '../eventLogStore'
import { CHAR_QUALITY_NAMES, CHAR_QUALITY_ORDER } from '../../data/uiCopy'
import { getArchiveMilestoneDef, unlockArchiveMilestone } from '../../data/archiveMilestones'
import { getPathName } from '../../data/cultivationPaths'
import { syncCharacterSkillLoadout } from '../../data/activeSkills'
import { needsCultivationPathChoice } from '../../systems/character/CultivationPathSystem'

const DISCIPLE_POOL_RECRUIT_DISCOUNT = 0.8
const TARGETED_RECRUIT_MULT = 1.5

function getAdjustedRecruitCost(baseCost: number, costMult: number): number {
  return Math.max(50, Math.floor(baseCost * costMult * DISCIPLE_POOL_RECRUIT_DISCOUNT))
}

export const createCharacterSlice: StateCreator<SectStore, [], [], Partial<SectStore>> = (set, get) => ({
  addCharacter: (quality: CharacterQuality) => {
    const { sect } = get()

    // Check quality unlock
    if (!isQualityUnlocked(quality, sect.level)) return null

    // Check character cap
    if (sect.characters.length >= getMaxCharacters(sect.level)) return null

    // Check spirit stone cost
    const baseCost = getRecruitCost(quality)
    const costMult = getRecruitCostMult(sect.buildings)
    const cost = getAdjustedRecruitCost(baseCost, costMult)
    if (sect.resources.spiritStone < cost) return null

    // Deduct stones
    const character = { ...generateCharacter(quality, sect.activeRoute), investedSpiritStone: cost }
    emitEvent('recruit', `招收弟子 ${character.name} (${CHAR_QUALITY_NAMES[quality] ?? quality})`)
    set((s) => ({
      sect: {
        ...s.sect,
        characters: [...s.sect.characters, character],
        resources: {
          ...s.sect.resources,
          spiritStone: s.sect.resources.spiritStone - cost,
        },
        stats: {
          ...s.sect.stats,
          totalRecruits: s.sect.stats.totalRecruits + 1,
          totalSpiritStoneSpent: s.sect.stats.totalSpiritStoneSpent + cost,
        },
      },
    }))

    if (character.quality !== 'common') {
      const currentMilestones = get().sect.archiveMilestones
      const nextMilestones = unlockArchiveMilestone(currentMilestones, 'firstRareRecruit')
      if (nextMilestones.length !== currentMilestones.length) {
        set((s) => ({
          sect: {
            ...s.sect,
            archiveMilestones: nextMilestones,
          },
        }))
        emitEvent('milestone', `宗门里程碑达成：${getArchiveMilestoneDef('firstRareRecruit').title}`)
      }
    }

    return character
  },

  canRecruit: (quality: CharacterQuality) => {
    const { sect } = get()

    if (!isQualityUnlocked(quality, sect.level)) {
      return { allowed: false, reason: '宗门等级不足' }
    }
    if (sect.characters.length >= getMaxCharacters(sect.level)) {
      return { allowed: false, reason: '弟子已满' }
    }
    const cost = getAdjustedRecruitCost(getRecruitCost(quality), getRecruitCostMult(sect.buildings))
    if (sect.resources.spiritStone < cost) {
      return { allowed: false, reason: '灵石不足' }
    }
    return { allowed: true, reason: '' }
  },

  removeCharacter: (id: string) => {
    set((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.filter((c) => c.id !== id),
      },
    }))
  },

  sacrificeCharacter: (id, context) => {
    const target = get().sect.characters.find((item) => item.id === id)
    if (!target) return false

    const refund = calcDiscipleDeathRefund(target)
    const eventType = context.source === 'breakthrough' ? 'breakthrough_failure' : 'adventure_fail'

    emitEvent(eventType, `${target.name}${context.reason}，返还灵石 ${refund}`, {
      characterId: target.id,
      source: context.source,
      refund,
    })

    set((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.filter((item) => item.id !== id),
        resources: {
          ...s.sect.resources,
          spiritStone: s.sect.resources.spiritStone + refund,
        },
      },
    }))

    return true
  },

  promoteCharacter: (id: string, newTitle) => {
    set((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) => (c.id === id ? { ...c, title: newTitle } : c)),
      },
    }))
  },

  setCharacterStatus: (id: string, status, opts) => {
    set((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) =>
          c.id === id
            ? { ...c, status, ...(opts?.injuryTimer !== undefined ? { injuryTimer: opts.injuryTimer } : {}) }
            : c
        ),
      },
    }))
  },

  setCharacterRecovering: (id: string, recoveryDays: number) => {
    set((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) =>
          c.id === id
            ? {
                ...c,
                status: 'recovering',
                injuryTimer: 0,
                recoveryDaysRemaining: Math.max(0, recoveryDays),
              }
            : c
        ),
      },
    }))
  },

  setAutomationSettings: (patch) => {
    set((s) => ({
      sect: {
        ...s.sect,
        automationSettings: {
          ...s.sect.automationSettings,
          ...patch,
        },
      },
    }))
  },

  chooseCultivationPath: (id: string, path: Exclude<CultivationPath, 'none'>) => {
    let changed = false

    set((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) => {
          if (c.id !== id || !needsCultivationPathChoice(c)) return c
          changed = true
          return syncCharacterSkillLoadout({ ...c, cultivationPath: path })
        }),
      },
    }))

    if (changed) {
      const character = get().sect.characters.find((c) => c.id === id)
      if (character) {
        emitEvent('milestone', `${character.name} 定下修行方向：${getPathName(path)}`)
      }
    }

    return changed
  },

  targetedRecruit: (minQuality: CharacterQuality) => {
    const { sect } = get()
    const recruitmentPavilion = sect.buildings.find((b) => b.type === 'recruitmentPavilion')
    if (!recruitmentPavilion || recruitmentPavilion.level < 3) return null

    // Check character cap
    const maxChars = getMaxCharacters(sect.level)
    if (sect.characters.length >= maxChars) return null

    // Quality ordering for comparison
    const minIndex = CHAR_QUALITY_ORDER.indexOf(minQuality)

    // Calculate cost: 2x normal recruit cost for the min quality + 10 herb
    const baseCost = getRecruitCost(minQuality)
    const costMult = getRecruitCostMult(sect.buildings)
    const stoneCost = Math.floor(baseCost * costMult * TARGETED_RECRUIT_MULT)
    const herbCost = 10

    if (sect.resources.spiritStone < stoneCost) return null
    if (sect.resources.herb < herbCost) return null

    // Generate characters until one matches quality >= minQuality (up to 10 attempts)
    // If minQuality is 'common', just roll once normally
    let character: ReturnType<typeof generateCharacter> | null = null
    const maxAttempts = minQuality === 'common' ? 1 : 10

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const candidate = generateCharacter(minQuality, sect.activeRoute)
      const candidateIndex = CHAR_QUALITY_ORDER.indexOf(candidate.quality)
      if (candidateIndex >= minIndex) {
        character = { ...candidate, investedSpiritStone: stoneCost }
        break
      }
    }

    if (!character) return null

    // Deduct resources and add character
    set((s) => ({
      sect: {
        ...s.sect,
        characters: [...s.sect.characters, character!],
        resources: {
          ...s.sect.resources,
          spiritStone: s.sect.resources.spiritStone - stoneCost,
          herb: s.sect.resources.herb - herbCost,
        },
        stats: {
          ...s.sect.stats,
          totalRecruits: s.sect.stats.totalRecruits + 1,
          totalSpiritStoneSpent: s.sect.stats.totalSpiritStoneSpent + stoneCost,
        },
      },
    }))

    if (character.quality !== 'common') {
      const currentMilestones = get().sect.archiveMilestones
      const nextMilestones = unlockArchiveMilestone(currentMilestones, 'firstRareRecruit')
      if (nextMilestones.length !== currentMilestones.length) {
        set((s) => ({
          sect: {
            ...s.sect,
            archiveMilestones: nextMilestones,
          },
        }))
        emitEvent('milestone', `宗门里程碑达成：${getArchiveMilestoneDef('firstRareRecruit').title}`)
      }
    }

    return character
  },
})
