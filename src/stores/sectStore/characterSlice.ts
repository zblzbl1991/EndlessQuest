import type { StateCreator } from 'zustand'
import type { SectStore } from './types'
import type { CharacterQuality } from '../../types/character'
import {
  generateCharacter,
  getMaxCharacters,
  getRecruitCost,
  isQualityUnlocked,
} from '../../systems/character/CharacterEngine'
import { getRecruitCostMult } from '../../systems/economy/BuildingEffects'
import { emitEvent } from '../eventLogStore'

export const createCharacterSlice: StateCreator<SectStore, [], [], SectStore> = (set, get) => ({
  addCharacter: (quality: CharacterQuality) => {
    const { sect } = get()

    // Check quality unlock
    if (!isQualityUnlocked(quality, sect.level)) return null

    // Check character cap
    if (sect.characters.length >= getMaxCharacters(sect.level)) return null

    // Check spirit stone cost
    const baseCost = getRecruitCost(quality)
    const costMult = getRecruitCostMult(sect.buildings)
    const cost = Math.floor(baseCost * costMult)
    if (sect.resources.spiritStone < cost) return null

    // Deduct stones
    const character = generateCharacter(quality)
    const qualityLabel: Record<string, string> = {
      common: '凡品',
      spirit: '灵品',
      immortal: '仙品',
      divine: '神品',
      chaos: '混沌',
    }
    emitEvent('recruit', `招收弟子 ${character.name} (${qualityLabel[quality] ?? quality})`)
    set((s) => ({
      sect: {
        ...s.sect,
        characters: [...s.sect.characters, character],
        resources: {
          ...s.sect.resources,
          spiritStone: s.sect.resources.spiritStone - cost,
        },
      },
    }))
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
    const cost = getRecruitCost(quality)
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

  targetedRecruit: (minQuality: CharacterQuality) => {
    const { sect } = get()
    const recruitmentPavilion = sect.buildings.find((b) => b.type === 'recruitmentPavilion')
    if (!recruitmentPavilion || recruitmentPavilion.level < 3) return null

    // Check character cap
    const maxChars = getMaxCharacters(sect.level)
    if (sect.characters.length >= maxChars) return null

    // Quality ordering for comparison
    const QUALITY_ORDER: CharacterQuality[] = ['common', 'spirit', 'immortal', 'divine', 'chaos']
    const minIndex = QUALITY_ORDER.indexOf(minQuality)

    // Calculate cost: 2x normal recruit cost for the min quality + 10 herb
    const baseCost = getRecruitCost(minQuality)
    const costMult = getRecruitCostMult(sect.buildings)
    const stoneCost = Math.floor(baseCost * costMult * 2)
    const herbCost = 10

    if (sect.resources.spiritStone < stoneCost) return null
    if (sect.resources.herb < herbCost) return null

    // Generate characters until one matches quality >= minQuality (up to 10 attempts)
    // If minQuality is 'common', just roll once normally
    let character: ReturnType<typeof generateCharacter> | null = null
    const maxAttempts = minQuality === 'common' ? 1 : 10

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const candidate = generateCharacter(minQuality)
      const candidateIndex = QUALITY_ORDER.indexOf(candidate.quality)
      if (candidateIndex >= minIndex) {
        character = candidate
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
      },
    }))

    return character
  },
})
