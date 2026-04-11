import type { StateCreator } from 'zustand'
import type { SectStore } from './types'
import {
  ALCHEMY_RECIPES,
  canCraft as canCraftAlchemy,
  craftPotion as craftPotionAlchemy,
} from '../../systems/economy/AlchemySystem'
import { ensureUnlockedExpeditionTemplates } from '../../data/expeditionTemplates'
import { FORGE_RECIPES, canForge, forgeEquipment as forgeEquipmentSystem } from '../../systems/economy/ForgeSystem'
import { getForgeBuff } from '../../systems/economy/BuildingEffects'
import { syncCharacterSkillLoadout } from '../../data/activeSkills'
import { countTechniqueCodexSlots, getTechniqueCodexCapacity } from '../../systems/technique/TechniqueSystem'
import { getArchiveMilestoneDef, unlockArchiveMilestone } from '../../data/archiveMilestones'
import { emitEvent } from '../eventLogStore'
import { removeItemsByName } from '../../systems/item/ItemStackUtils'
import { getLegacyTemplateCapacity } from '../../data/legacy'

function getScriptureHallLevel(store: Pick<SectStore, 'sect'>): number {
  return store.sect.buildings.find((building) => building.type === 'scriptureHall')?.level ?? 0
}

function getForgeMaterialCounts(vault: SectStore['sect']['vault']): Record<string, number> {
  return vault.reduce<Record<string, number>>((acc, stack) => {
    acc[stack.item.name] = (acc[stack.item.name] ?? 0) + stack.quantity
    return acc
  }, {})
}

function hasLegacyEquipmentPair(sect: SectStore['sect']): boolean {
  const allEquipment = [
    ...sect.vault.map((stack) => stack.item),
    ...sect.characters.flatMap((character) => character.backpack.map((stack) => stack.item)),
  ].filter(
    (item): item is Extract<(typeof sect.vault)[number]['item'], { type: 'equipment' }> => item.type === 'equipment'
  )

  const hasWeapon = allEquipment.some((item) => item.quality === 'chaos' && item.slot === 'weapon')
  const hasTalisman = allEquipment.some((item) => item.quality === 'chaos' && item.slot === 'talisman')
  return hasWeapon && hasTalisman
}

export const createTechniqueSlice: StateCreator<SectStore, [], [], Partial<SectStore>> = (set, get) => ({
  unlockCodexEntry: (techniqueId: string): boolean => {
    const store = get()
    if (store.sect.techniqueCodex.includes(techniqueId)) return false

    const scriptureLevel = getScriptureHallLevel(store)
    const capacity = getTechniqueCodexCapacity(scriptureLevel)
    if (countTechniqueCodexSlots(store.sect.techniqueCodex) >= capacity) return false

    set((state) => ({
      sect: {
        ...state.sect,
        techniqueCodex: [...state.sect.techniqueCodex, techniqueId],
      },
    }))

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
    if (!alreadyKnown && countTechniqueCodexSlots(store.sect.techniqueCodex) >= capacity) return false

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

    const unlockedMilestoneIds = sect.archiveMilestones.map((milestone) => milestone.id)
    const materialCounts = getForgeMaterialCounts(sect.vault)
    if (
      !canForge(
        recipe,
        { ore: sect.resources.ore, spiritStone: sect.resources.spiritStone },
        forgeLevel,
        materialCounts,
        unlockedMilestoneIds
      )
    ) {
      if (recipe.requiredMilestone && !unlockedMilestoneIds.includes(recipe.requiredMilestone)) {
        return {
          success: false,
          reason: `需要先达成里程碑「${getArchiveMilestoneDef(recipe.requiredMilestone).title}」`,
        }
      }
      const missingMaterial = recipe.materialCosts?.find(
        (material) => (materialCounts[material.itemName] ?? 0) < material.quantity
      )
      if (missingMaterial) {
        return {
          success: false,
          reason: `缺少 ${missingMaterial.itemName}（${materialCounts[missingMaterial.itemName] ?? 0}/${missingMaterial.quantity}）`,
        }
      }
      return { success: false, reason: 'Insufficient forge resources.' }
    }

    const { successBonus } = getForgeBuff(forgeLevel)
    const item = forgeEquipmentSystem(recipe, forgeLevel, successBonus)
    if (!item) return { success: false, reason: 'Forge attempt failed.' }

    let nextVault = sect.vault
    for (const material of recipe.materialCosts ?? []) {
      const result = removeItemsByName(nextVault, material.itemName, material.quantity)
      nextVault = result.stacks
    }

    set((state) => ({
      sect: {
        ...state.sect,
        resources: {
          ...state.sect.resources,
          ore: state.sect.resources.ore - recipe.cost.ore,
          spiritStone: state.sect.resources.spiritStone - recipe.cost.spiritStone,
        },
        vault: nextVault,
      },
    }))

    get().addToVault(item)
    emitEvent('item_crafted', `炼器坊铸成了 ${item.name}`, {
      itemId: item.id,
      itemName: item.name,
      itemQuality: item.quality,
      isLegacyCraft: Boolean(recipe.legacy),
      legacyDungeonId: recipe.legacy ? 'guixuRift' : undefined,
      legacyRecipeId: recipe.legacy ? recipe.id : undefined,
    })

    if (recipe.legacy) {
      emitEvent('milestone', `归墟遗材在炼器坊中重铸为 ${item.name}`, {
        legacyDungeonId: 'guixuRift',
        legacyRecipeId: recipe.id,
        itemId: item.id,
        itemName: item.name,
      })
    }

    {
      const { sect: updatedSect } = get()
      const currentMilestones = updatedSect.archiveMilestones
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

    if (recipe.legacy) {
      const { sect: updatedSect } = get()
      const currentMilestones = updatedSect.archiveMilestones
      const nextMilestones = unlockArchiveMilestone(currentMilestones, 'firstLegacyForge')
      if (nextMilestones.length !== currentMilestones.length) {
        set((s) => ({
          sect: {
            ...s.sect,
            archiveMilestones: nextMilestones,
          },
        }))
        emitEvent('milestone', `宗门里程碑达成：${getArchiveMilestoneDef('firstLegacyForge').title}`, {
          legacyDungeonId: 'guixuRift',
          legacyRecipeId: recipe.id,
          itemId: item.id,
          itemName: item.name,
        })
      }
    }

    if (recipe.legacy) {
      const { sect: updatedSect } = get()
      if (hasLegacyEquipmentPair(updatedSect)) {
        const currentMilestones = updatedSect.archiveMilestones
        const nextMilestones = unlockArchiveMilestone(currentMilestones, 'legacyForgePair')
        if (nextMilestones.length !== currentMilestones.length) {
          set((s) => ({
            sect: {
              ...s.sect,
              archiveMilestones: nextMilestones,
              automationSettings: {
                ...s.sect.automationSettings,
                expeditionTemplates: ensureUnlockedExpeditionTemplates(
                  s.sect.automationSettings.expeditionTemplates,
                  nextMilestones,
                  getLegacyTemplateCapacity(s.sect.legacy.ascensionCount)
                ),
              },
            },
          }))
          emitEvent('milestone', `宗门里程碑达成：${getArchiveMilestoneDef('legacyForgePair').title}`, {
            legacyDungeonId: 'guixuRift',
            legacyRecipeId: recipe.id,
            itemId: item.id,
            itemName: item.name,
          })
        }
      }
    }

    if (recipe.id === 'forge_guixu_armor') {
      const { sect: updatedSect } = get()
      const currentMilestones = updatedSect.archiveMilestones
      const nextMilestones = unlockArchiveMilestone(currentMilestones, 'legacyForgeTrinity')
      if (nextMilestones.length !== currentMilestones.length) {
        set((s) => ({
          sect: {
            ...s.sect,
            archiveMilestones: nextMilestones,
          },
        }))
        emitEvent('milestone', `宗门里程碑达成：${getArchiveMilestoneDef('legacyForgeTrinity').title}`, {
          legacyDungeonId: 'guixuRift',
          legacyRecipeId: recipe.id,
          itemId: item.id,
          itemName: item.name,
        })
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
    const usedSlots = countTechniqueCodexSlots(store.sect.techniqueCodex)
    return {
      success: false,
      reason: `Scripture Hall only expands codex capacity. Current occupied codex slots ${usedSlots}/${capacity}. Legacy inheritances do not consume normal slots.`,
    }
  },
})
