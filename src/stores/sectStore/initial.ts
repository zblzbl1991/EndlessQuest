import type { StateCreator } from 'zustand'
import type { SectStore } from './types'
import type { Equipment, Sect } from '../../types'
import { ALCHEMY_RECIPES, craftPotion as craftPotionAlchemy } from '../../systems/economy/AlchemySystem'
import { FORGE_RECIPES, FORGE_SLOTS } from '../../systems/economy/ForgeSystem'
import { generateEquipment } from '../../systems/item/ItemGenerator'
import type { AutoRecipe } from '../../data/recipes'
import { BUILDING_DEFS } from '../../data/buildings'
import { generateCharacter } from '../../systems/character/CharacterEngine'
import type { ShopState } from '../../systems/trade/TradeSystem'
import { createLegacyExpeditionTemplates } from '../../data/expeditionTemplates'

let _materialIdCounter = 0

// ---------------------------------------------------------------------------
// Helper: get equipment item by ID from vault + all character backpacks
// ---------------------------------------------------------------------------

export function findEquipmentById(sect: Sect, itemId: string): Equipment | undefined {
  for (const stack of sect.vault) {
    if (stack.item.id === itemId && stack.item.type === 'equipment') return stack.item
  }
  for (const char of sect.characters) {
    for (const stack of char.backpack) {
      if (stack.item.id === itemId && stack.item.type === 'equipment') return stack.item
    }
  }
  return undefined
}

// ---------------------------------------------------------------------------
// Helper: produce item from an AutoRecipe
// ---------------------------------------------------------------------------

export function produceItemAsStack(recipe: AutoRecipe, buildingLevel: number) {
  if (recipe.productType === 'consumable') {
    const alchemyRecipe = ALCHEMY_RECIPES.find((r) => r.id === recipe.id)
    if (!alchemyRecipe) return null
    const item = craftPotionAlchemy(alchemyRecipe, buildingLevel)
    if (item) item.recipeId = recipe.id
    return item ? { item, quantity: 1 } : null
  }
  if (recipe.productType === 'equipment') {
    const forgeRecipe = FORGE_RECIPES.find((r) => r.id === recipe.id)
    if (!forgeRecipe) return null
    const slot = FORGE_SLOTS[Math.floor(Math.random() * FORGE_SLOTS.length)]
    const item = generateEquipment(slot, forgeRecipe.quality)
    return item ? { item, quantity: 1 } : null
  }
  if (recipe.productType === 'material') {
    const item: import('../../types/item').Material = {
      id: 'mat_' + Date.now() + '_' + ++_materialIdCounter,
      name: recipe.name,
      quality: 'common',
      type: 'material',
      description: `炼制材料：${recipe.name}`,
      sellPrice: Math.round(recipe.totalCost.spiritStone * 0.5),
      category: recipe.id === 'refined_herb' ? 'herb' : recipe.id === 'refined_ore' ? 'ore' : 'other',
    }
    return { item, quantity: 1 }
  }
  return null
}

// ---------------------------------------------------------------------------
// Initial state factory
// ---------------------------------------------------------------------------

export function createInitialState(): { sect: Sect } {
  return {
    sect: {
      name: '无名宗门',
      level: 1,
      resources: {
        spiritStone: 500,
        spiritEnergy: 0,
        herb: 0,
        ore: 0,
      },
      buildings: BUILDING_DEFS.map((def) => ({
        type: def.type,
        level: def.type === 'mainHall' || def.type === 'spiritMine' || def.type === 'spiritField' ? 1 : 0,
        count: def.type === 'mainHall' || def.type === 'spiritMine' || def.type === 'spiritField' ? 1 : 0,
        unlocked: def.type === 'mainHall' || def.type === 'spiritMine' || def.type === 'spiritField',
        productionQueue: { recipeId: null, progress: 0 },
      })),
      characters: [generateCharacter('common')],
      vault: [],
      maxVaultSlots: 50,
      pets: [],
      totalAdventureRuns: 0,
      totalBreakthroughs: 0,
      lastTransmissionTime: 0,
      techniqueCodex: ['qingxin', 'lieyan', 'houtu'],
      offlineAccumulator: {
        resourcesGained: { spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0 },
        breakthroughs: [],
        itemsCrafted: [],
        taxIncome: 0,
      },
      sectPath: 'none' as const,
      activeRoute: null,
      unlockedPathNodeIds: [],
      pathUnlockedAt: null,
      legacy: { ascensionCount: 0, statBonus: 0, unlockedTechniques: [], unlockedDungeons: [] },
      archiveMilestones: [],
      automationSettings: {
        reserveSpiritStone: 300,
        reserveSpiritEnergy: 120,
        preferredDungeonId: 'lingCaoValley',
        casualtyTolerance: 'balanced',
        autoBreakthrough: true,
        productionFocus: 'balanced',
        overflowTriggerRatio: 0.9,
        herbOverflowRule: 'sell',
        oreOverflowRule: 'sell',
        spiritStoneOverflowRule: 'buyHerb',
        activeTemplateId: 'steadyHarvest',
        expeditionTemplates: createLegacyExpeditionTemplates(0),
        routeShift: {
          currentArchetype: 'pillSustain' as const,
          lastShiftAtDay: null,
          shiftCooldownDays: 3,
          pendingShift: null,
          blendDaysRemaining: 0,
        },
        productionCampaign: {
          activeCampaign: null,
          startedAtDay: null,
          durationHours: 8,
          cooldownHours: 4,
          cooldownRemainingHours: 0,
        },
        templateConfidence: [],
      },
      stats: {
        totalSpiritStoneEarned: 0,
        totalSpiritStoneSpent: 0,
        totalBattles: 0,
        totalVictories: 0,
        totalKills: 0,
        maxFloorCleared: 0,
        totalRecruits: 0,
        totalBreakthroughAttempts: 0,
        totalBreakthroughSuccesses: 0,
        totalBuildingUpgrades: 0,
        totalAdventureRuns: 0,
        totalAdventureCompletions: 0,
        totalAdventureFailures: 0,
        totalPetCaptures: 0,
        totalPlayTime: 0,
        longestOfflineSeconds: 0,
      },
      currentArchetype: 'pillSustain' as const,
      strategySettings: {
        activePolicy: 'balanced',
        switchCooldownDays: 3,
        lastSwitchedAt: null,
      },
      autoRunDayCounter: 0,
      lastRandomEventTime: 0,
      monsterCodex: {},
      equipmentCodex: {},
    },
  }
}

// ---------------------------------------------------------------------------
// Initial slice: owns sect + shopState state
// ---------------------------------------------------------------------------

export const createInitialSlice: StateCreator<SectStore, [], [], Partial<SectStore>> = () => ({
  sect: createInitialState().sect,
  shopState: null as ShopState | null,
})
