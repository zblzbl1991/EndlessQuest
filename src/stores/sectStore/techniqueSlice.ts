import type { StateCreator } from 'zustand'
import type { SectStore } from './types'
import {
  ALCHEMY_RECIPES,
  canCraft as canCraftAlchemy,
  craftPotion as craftPotionAlchemy,
} from '../../systems/economy/AlchemySystem'
import { FORGE_RECIPES, canForge, forgeEquipment as forgeEquipmentSystem } from '../../systems/economy/ForgeSystem'
import { getForgeBuff } from '../../systems/economy/BuildingEffects'
import { syncCharacterSkillLoadout } from '../../data/activeSkills'
import { getTechniqueCodexCapacity } from '../../systems/technique/TechniqueSystem'
import { getArchiveMilestoneDef, unlockArchiveMilestone } from '../../data/archiveMilestones'
import { emitEvent } from '../eventLogStore'

function getScriptureHallLevel(store: Pick<SectStore, 'sect'>): number {
  return store.sect.buildings.find((building) => building.type === 'scriptureHall')?.level ?? 0
}

export const createTechniqueSlice: StateCreator<SectStore, [], [], Partial<SectStore>> = (set, get) => ({
  unlockCodexEntry: (techniqueId: string): boolean => {
    const store = get()
    if (store.sect.techniqueCodex.includes(techniqueId)) return false

    const scriptureLevel = getScriptureHallLevel(store)
    const capacity = getTechniqueCodexCapacity(scriptureLevel)
    if (store.sect.techniqueCodex.length >= capacity) return false

    set((state) => ({
      sect: {
        ...state.sect,
        techniqueCodex: [...state.sect.techniqueCodex, techniqueId],
      },
    }))

    // First technique unlock milestone
    {
      const { sect } = get()
      const currentMilestones = sect.archiveMilestones
      const nextMilestones = unlockArchiveMilestone(currentMilestones, 'firstTechniqueUnlock')
      if (nextMilestones.length !== currentMilestones.length) {
        set((s) => ({
          sect: {
            ...s.sect,
            archiveMilestones: nextMilestones,
          },
        }))
        emitEvent('milestone', `宗门里程碑达成：${getArchiveMilestoneDef('firstTechniqueUnlock').title}`)
      }
    }

    return true
  },

  unlockCodexAndLearn: (techniqueId: string, characterId: string): boolean => {
    const store = get()
    const character = store.sect.characters.find((item) => item.id === characterId)
    if (!character) return false

    const alreadyKnown = store.sect.techniqueCodex.includes(techniqueId)
    const alreadyLearned = character.learnedTechniques.includes(techniqueId)
    if (alreadyKnown && alreadyLearned) return true

    const scriptureLevel = getScriptureHallLevel(store)
    const capacity = getTechniqueCodexCapacity(scriptureLevel)
    if (!alreadyKnown && store.sect.techniqueCodex.length >= capacity) return false

    set((state) => ({
      sect: {
        ...state.sect,
        techniqueCodex: alreadyKnown ? state.sect.techniqueCodex : [...state.sect.techniqueCodex, techniqueId],
        characters: state.sect.characters.map((item) =>
          item.id === characterId
            ? syncCharacterSkillLoadout({
                ...item,
                learnedTechniques: alreadyLearned ? item.learnedTechniques : [...item.learnedTechniques, techniqueId],
              })
            : item
        ),
      },
    }))

    return true
  },

  craftPotion: (recipeId: string) => {
    const { sect } = get()
    const furnaceLevel = sect.buildings.find((building) => building.type === 'alchemyFurnace')?.level ?? 0
    const recipe = ALCHEMY_RECIPES.find((item) => item.id === recipeId)
    if (!recipe) return { success: false, reason: 'Unknown alchemy recipe.' }
    if (
      !canCraftAlchemy(recipe, { herb: sect.resources.herb, spiritStone: sect.resources.spiritStone }, furnaceLevel)
    ) {
      return { success: false, reason: 'Insufficient alchemy resources.' }
    }

    const potion = craftPotionAlchemy(recipe, furnaceLevel)
    if (!potion) return { success: false, reason: 'Alchemy craft failed.' }

    set((state) => ({
      sect: {
        ...state.sect,
        resources: {
          ...state.sect.resources,
          herb: state.sect.resources.herb - recipe.cost.herb,
          spiritStone: state.sect.resources.spiritStone - (recipe.cost.spiritStone ?? 0),
        },
      },
    }))

    get().addToVault(potion)
    return { success: true, reason: '' }
  },

  forgeEquipment: (recipeId: string) => {
    const { sect } = get()
    const forgeLevel = sect.buildings.find((building) => building.type === 'forge')?.level ?? 0
    const recipe = FORGE_RECIPES.find((item) => item.id === recipeId)
    if (!recipe) return { success: false, reason: 'Unknown forge recipe.' }
    if (!canForge(recipe, { ore: sect.resources.ore, spiritStone: sect.resources.spiritStone }, forgeLevel)) {
      return { success: false, reason: 'Insufficient forge resources.' }
    }

    const { successBonus } = getForgeBuff(forgeLevel)
    const item = forgeEquipmentSystem(recipe, forgeLevel, successBonus)
    if (!item) return { success: false, reason: 'Forge attempt failed.' }

    set((state) => ({
      sect: {
        ...state.sect,
        resources: {
          ...state.sect.resources,
          ore: state.sect.resources.ore - recipe.cost.ore,
          spiritStone: state.sect.resources.spiritStone - recipe.cost.spiritStone,
        },
      },
    }))

    get().addToVault(item)

    // First item craft milestone
    {
      const { sect } = get()
      const currentMilestones = sect.archiveMilestones
      const nextMilestones = unlockArchiveMilestone(currentMilestones, 'firstItemCraft')
      if (nextMilestones.length !== currentMilestones.length) {
        set((s) => ({
          sect: {
            ...s.sect,
            archiveMilestones: nextMilestones,
          },
        }))
        emitEvent('milestone', `宗门里程碑达成：${getArchiveMilestoneDef('firstItemCraft').title}`)
      }
    }

    return { success: true, reason: '' }
  },

  studyTechnique: () => {
    const store = get()
    const scriptureLevel = getScriptureHallLevel(store)
    if (scriptureLevel <= 0) {
      return { success: false, reason: 'Scripture Hall level too low.' }
    }

    const capacity = getTechniqueCodexCapacity(scriptureLevel)
    return {
      success: false,
      reason: `Scripture Hall only expands codex capacity. Current codex ${store.sect.techniqueCodex.length}/${capacity}. Discover new techniques in adventure.`,
    }
  },
})
