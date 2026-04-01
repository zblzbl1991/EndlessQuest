import type { StateCreator } from 'zustand'
import type { SectStore } from './types'
import {
  ALCHEMY_RECIPES,
  canCraft as canCraftAlchemy,
  craftPotion as craftPotionAlchemy,
} from '../../systems/economy/AlchemySystem'
import { FORGE_RECIPES, canForge, forgeEquipment as forgeEquipmentSystem } from '../../systems/economy/ForgeSystem'
import { getForgeBuff } from '../../systems/economy/BuildingEffects'
import { getTechniqueById, TECHNIQUES } from '../../data/techniquesTable'
import { syncCharacterSkillLoadout } from '../../data/activeSkills'
import { TECHNIQUE_TIER_ORDER } from '../../types/technique'
import { emitEvent } from '../eventLogStore'

export const createTechniqueSlice: StateCreator<SectStore, [], [], Partial<SectStore>> = (set, get) => ({
  unlockCodexEntry: (techniqueId: string): boolean => {
    const { sect } = get()
    if (sect.techniqueCodex.includes(techniqueId)) return false
    set((s) => ({
      sect: {
        ...s.sect,
        techniqueCodex: [...s.sect.techniqueCodex, techniqueId],
      },
    }))
    return true
  },

  unlockCodexAndLearn: (techniqueId: string, characterId: string): boolean => {
    const { sect } = get()
    const char = sect.characters.find((c) => c.id === characterId)
    if (!char) return false
    if (char.learnedTechniques.includes(techniqueId) && sect.techniqueCodex.includes(techniqueId)) return true

    set((s) => ({
      sect: {
        ...s.sect,
        techniqueCodex: s.sect.techniqueCodex.includes(techniqueId)
          ? s.sect.techniqueCodex
          : [...s.sect.techniqueCodex, techniqueId],
        characters: s.sect.characters.map((c) =>
          c.id === characterId
            ? syncCharacterSkillLoadout({
                ...c,
                learnedTechniques: c.learnedTechniques.includes(techniqueId)
                  ? c.learnedTechniques
                  : [...c.learnedTechniques, techniqueId],
              })
            : c
        ),
      },
    }))
    return true
  },

  craftPotion: (recipeId: string) => {
    const { sect } = get()
    const furnaceLevel = sect.buildings.find((b) => b.type === 'alchemyFurnace')?.level ?? 0
    const recipe = ALCHEMY_RECIPES.find((r) => r.id === recipeId)
    if (!recipe) return { success: false, reason: '未知丹方' }
    if (!canCraftAlchemy(recipe, { herb: sect.resources.herb, spiritStone: sect.resources.spiritStone }, furnaceLevel))
      return { success: false, reason: '资源或等级不足' }
    const potion = craftPotionAlchemy(recipe, furnaceLevel)
    if (!potion) return { success: false, reason: '炼制失败' }
    // Deduct resources
    set((s) => ({
      sect: {
        ...s.sect,
        resources: {
          ...s.sect.resources,
          herb: s.sect.resources.herb - recipe.cost.herb,
          spiritStone: s.sect.resources.spiritStone - (recipe.cost.spiritStone ?? 0),
        },
      },
    }))
    // Add to vault
    get().addToVault(potion)
    return { success: true, reason: '' }
  },

  forgeEquipment: (recipeId: string) => {
    const { sect } = get()
    const forgeLevel = sect.buildings.find((b) => b.type === 'forge')?.level ?? 0
    const recipe = FORGE_RECIPES.find((r) => r.id === recipeId)
    if (!recipe) return { success: false, reason: '未知配方' }
    if (!canForge(recipe, { ore: sect.resources.ore, spiritStone: sect.resources.spiritStone }, forgeLevel))
      return { success: false, reason: '资源或等级不足' }
    const { successBonus } = getForgeBuff(forgeLevel)
    // Attempt forge before deducting resources
    const item = forgeEquipmentSystem(recipe, forgeLevel, successBonus)
    if (!item) return { success: false, reason: '锻造失败' }
    // Deduct resources only on success
    set((s) => ({
      sect: {
        ...s.sect,
        resources: {
          ...s.sect.resources,
          ore: s.sect.resources.ore - recipe.cost.ore,
          spiritStone: s.sect.resources.spiritStone - recipe.cost.spiritStone,
        },
      },
    }))
    get().addToVault(item)
    return { success: true, reason: '' }
  },

  studyTechnique: () => {
    const { sect } = get()
    const scriptureLevel = sect.buildings.find((b) => b.type === 'scriptureHall')?.level ?? 0
    if (scriptureLevel < 3) return { success: false, reason: '藏经阁等级不足' }
    const cost = 100 * sect.level
    if (sect.resources.spiritStone < cost) return { success: false, reason: '灵石不足' }

    // Determine max tier from highest character realm
    const maxRealm = Math.max(...sect.characters.map((c) => c.realm), 0)
    const maxTierIdx = Math.min(maxRealm, TECHNIQUE_TIER_ORDER.length - 1)

    // Weighted random: lower tiers more likely
    const weights: number[] = []
    for (let i = 0; i <= maxTierIdx; i++) {
      weights.push(Math.pow(2, maxTierIdx - i))
    }
    const totalWeight = weights.reduce((a, b) => a + b, 0)
    let roll = Math.random() * totalWeight
    let selectedTierIdx = 0
    for (let i = 0; i < weights.length; i++) {
      roll -= weights[i]
      if (roll <= 0) {
        selectedTierIdx = i
        break
      }
    }
    const selectedTier = TECHNIQUE_TIER_ORDER[selectedTierIdx]

    const candidates = TECHNIQUES.filter((t) => t.tier === selectedTier && !sect.techniqueCodex.includes(t.id))

    if (candidates.length === 0) {
      return { success: false, reason: '所有该品阶功法已解锁' }
    }

    const technique = candidates[Math.floor(Math.random() * candidates.length)]

    // Deduct cost and unlock
    set((s) => ({
      sect: {
        ...s.sect,
        resources: { ...s.sect.resources, spiritStone: s.sect.resources.spiritStone - cost },
        techniqueCodex: [...s.sect.techniqueCodex, technique.id],
      },
    }))

    const techniqueName = getTechniqueById(technique.id)?.name ?? technique.id
    emitEvent('technique_unlocked', `藏经阁参悟获得 ${techniqueName}`)

    return { success: true, reason: technique.id }
  },
})
