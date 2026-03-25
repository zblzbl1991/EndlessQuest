import { create } from 'zustand'
import type {
  Character, CharacterTitle, CharacterQuality, CharacterStatus,
} from '../types/character'
import type {
  BuildingType, Resources, ResourceType, Sect, AnyItem, Equipment,
} from '../types'
import type { Pet } from '../systems/pet/PetSystem'
import type { Technique } from '../types/technique'
import { generateCharacter, calcSectLevel, getMaxCharacters, getRecruitCost, isQualityUnlocked } from '../systems/character/CharacterEngine'
import { calcResourceRates } from '../systems/economy/ResourceEngine'
import { tick as cultivationTick, canBreakthrough, breakthrough as performBreakthrough } from '../systems/cultivation/CultivationEngine'
import { tickComprehension, canLearnTechnique } from '../systems/technique/TechniqueSystem'
import { attemptEnhance } from '../systems/equipment/EquipmentEngine'
import { checkBuildingUnlock, canUpgradeBuilding } from '../systems/sect/BuildingSystem'
import { getTrainingSpeedMult, getComprehensionSpeedMult, getRecruitCostMult, getForgeBuff, getBuildingLevel } from '../systems/economy/BuildingEffects'
import { createShopState, generateDailyItems } from '../systems/trade/TradeSystem'
import type { ShopState } from '../systems/trade/TradeSystem'
import { ALCHEMY_RECIPES, canCraft as canCraftAlchemy, craftPotion as craftPotionAlchemy } from '../systems/economy/AlchemySystem'
import { FORGE_RECIPES, FORGE_SLOTS, canForge, forgeEquipment as forgeEquipmentSystem } from '../systems/economy/ForgeSystem'
import { generateEquipment, generateRandomTechniqueScroll } from '../systems/item/ItemGenerator'
import { getTechniqueById } from '../data/techniquesTable'
import { BUILDING_DEFS, calcResourceCaps } from '../data/buildings'
import { REALMS, BREAKTHROUGH_COSTS } from '../data/realms'
import { tickProductionQueue, calcOfflineProduction, canStartRecipe } from '../systems/building/ProductionSystem'
import { clampResources } from '../systems/economy/ResourceEngine'
import type { ProductionBonuses } from '../systems/economy/ResourceEngine'
import { getAutoRecipeById } from '../data/recipes'
import type { AutoRecipe } from '../data/recipes'
import { calcCultivationRate } from '../systems/cultivation/CultivationEngine'

// ---------------------------------------------------------------------------
// Helper: get equipment item by ID from vault + all character backpacks
// ---------------------------------------------------------------------------

function findEquipmentById(sect: Sect, itemId: string): Equipment | undefined {
  for (const item of sect.vault) {
    if (item.id === itemId && item.type === 'equipment') return item
  }
  for (const char of sect.characters) {
    for (const item of char.backpack) {
      if (item.id === itemId && item.type === 'equipment') return item
    }
  }
  return undefined
}

// ---------------------------------------------------------------------------
// Initial state factory
// ---------------------------------------------------------------------------

function createInitialState(): { sect: Sect } {
  return {
    sect: {
      name: '无名宗门',
      level: 1,
      resources: {
        spiritStone: 500, spiritEnergy: 0, herb: 0, ore: 0,
      },
      buildings: BUILDING_DEFS.map((def) => ({
        type: def.type,
        level: def.type === 'mainHall' ? 1 : 0,
        unlocked: def.type === 'mainHall' || def.type === 'spiritMine',
        productionQueue: { recipeId: null, progress: 0 },
      })),
      characters: [generateCharacter('common')],
      vault: [],
      maxVaultSlots: 50,
      pets: [],
      totalAdventureRuns: 0,
      totalBreakthroughs: 0,
      lastTransmissionTime: 0,
    },
  }
}

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

export interface SectStore {
  sect: Sect
  shopState: ShopState | null

  // Shop
  initShop(): void
  buyFromShop(shopItemIndex: number, isDaily: boolean): { success: boolean; reason: string }
  refreshDailyShop(): void

  // Character management
  addCharacter(quality: CharacterQuality): Character | null
  canRecruit(quality: CharacterQuality): { allowed: boolean; reason: string }
  removeCharacter(id: string): void
  promoteCharacter(id: string, newTitle: CharacterTitle): void
  setCharacterStatus(id: string, status: CharacterStatus, opts?: { injuryTimer?: number }): void

  // Technique management
  learnTechnique(characterId: string, backpackIndex: number): boolean
  switchTechnique(characterId: string, techniqueId: string): boolean

  // Building management
  upgradeBuilding(type: BuildingType): boolean
  tryUpgradeBuilding(type: BuildingType): { success: boolean; reason: string }
  setProductionRecipe(buildingType: BuildingType, recipeId: string | null): void

  // Item transfer
  transferItemToCharacter(characterId: string, vaultIndex: number): boolean
  transferItemToVault(characterId: string, backpackIndex: number): boolean
  addToVault(item: AnyItem): boolean
  sellItem(vaultIndex: number): boolean
  removeVaultItem(vaultIndex: number): AnyItem | null

  // Character inventory
  equipItem(characterId: string, backpackIndex: number, slotIndex: number): boolean
  unequipItem(characterId: string, slotIndex: number): boolean
  enhanceItem(characterId: string, backpackIndex: number): { success: boolean; newLevel: number; cost: { spiritStone: number; ore: number } }
  sellCharacterItem(characterId: string, backpackIndex: number): boolean

  // Healing
  healCharacter(characterId: string): boolean

  // Resource operations (GLOBAL UNIQUE)
  spendResource(type: keyof Resources, amount: number): boolean
  addResource(type: keyof Resources, amount: number): void

  // Market exchange
  exchangeResources(from: ResourceType, to: ResourceType, amount: number): { success: boolean; received?: number; reason?: string }

  // Breakthrough
  attemptBreakthrough(characterId: string): { success: boolean; newRealm: number; newStage: number; statsChanged: boolean }

  // Main tick (called every second)
  tickAll(deltaSec: number): { spiritProduced: number; spiritConsumed: number }

  // Building feature actions
  craftPotion(recipeId: string): { success: boolean; reason: string }
  forgeEquipment(recipeId: string): { success: boolean; reason: string }
  studyTechnique(): { success: boolean; reason: string }
  groupTransmission(): { success: boolean; reason: string; charactersUpdated: number }
  targetedRecruit(minQuality: CharacterQuality): Character | null

  // Pet management
  addPet(pet: Pet): void
  removePet(petId: string): void
  assignPet(characterId: string, petId: string): boolean
  unassignPet(characterId: string, petId: string): void

  reset(): void
}

// ---------------------------------------------------------------------------
// Helper: produce item from an AutoRecipe
// ---------------------------------------------------------------------------

function produceItemFromRecipe(recipe: AutoRecipe, buildingLevel: number): AnyItem | null {
  if (recipe.productType === 'consumable') {
    const alchemyRecipe = ALCHEMY_RECIPES.find(r => r.id === recipe.id)
    if (!alchemyRecipe) return null
    const item = craftPotionAlchemy(alchemyRecipe, buildingLevel)
    if (item) (item as any).recipeId = recipe.id
    return item
  }
  if (recipe.productType === 'equipment') {
    const forgeRecipe = FORGE_RECIPES.find(r => r.id === recipe.id)
    if (!forgeRecipe) return null
    const slot = FORGE_SLOTS[Math.floor(Math.random() * FORGE_SLOTS.length)]
    return generateEquipment(slot, forgeRecipe.quality)
  }
  return null
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useSectStore = create<SectStore>((set, get) => ({
  sect: createInitialState().sect,
  shopState: null as ShopState | null,

  // ---- Shop ----

  initShop: () => {
    const { sect } = get()
    const marketLevel = sect.buildings.find(b => b.type === 'market')?.level ?? 0
    const shop = createShopState(marketLevel)
    set({ shopState: shop })
  },

  buyFromShop: (shopItemIndex, isDaily) => {
    const { sect } = get()
    const shop = get().shopState
    if (!shop) return { success: false, reason: '商店未初始化' }
    const items = isDaily ? shop.dailyItems : shop.fixedItems
    const shopItem = items[shopItemIndex]
    if (!shopItem) return { success: false, reason: '商品不存在' }
    if (shopItem.stock === 0) return { success: false, reason: '已售罄' }
    if (sect.resources.spiritStone < shopItem.price) return { success: false, reason: '灵石不足' }
    // Deduct and add to vault
    set(s => ({ sect: { ...s.sect, resources: { ...s.sect.resources, spiritStone: s.sect.resources.spiritStone - shopItem.price } } }))
    get().addToVault(shopItem.item)
    // Mark as sold
    if (isDaily) {
      const newDaily = [...shop.dailyItems]
      newDaily[shopItemIndex] = { ...shopItem, stock: (shopItem.stock === -1 ? -1 : shopItem.stock - 1) }
      set({ shopState: { ...shop, dailyItems: newDaily } })
    }
    return { success: true, reason: '' }
  },

  refreshDailyShop: () => {
    const { sect } = get()
    const marketLevel = sect.buildings.find(b => b.type === 'market')?.level ?? 0
    const newDailyItems = generateDailyItems(marketLevel)
    const shop = get().shopState
    if (shop) {
      set({ shopState: { ...shop, dailyItems: newDailyItems, lastRefreshTime: Date.now() } })
    }
  },

  // ---- Character management ----

  addCharacter: (quality) => {
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

  canRecruit: (quality) => {
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

  removeCharacter: (id) => {
    set((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.filter((c) => c.id !== id),
      },
    }))
  },

  promoteCharacter: (id, newTitle) => {
    set((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) =>
          c.id === id ? { ...c, title: newTitle } : c
        ),
      },
    }))
  },

  setCharacterStatus: (id, status, opts) => {
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

  // ---- Technique management ----

  learnTechnique: (characterId, backpackIndex) => {
    const { sect } = get()
    const char = sect.characters.find((c) => c.id === characterId)
    if (!char) return false

    const item = char.backpack[backpackIndex]
    if (!item || item.type !== 'techniqueScroll') return false

    const technique = getTechniqueById(item.techniqueId)
    if (!technique) return false

    if (!canLearnTechnique(char, technique)) return false

    // Consume the scroll
    const newBackpack = [...char.backpack]
    newBackpack.splice(backpackIndex, 1)

    set((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) =>
          c.id === characterId
            ? {
                ...c,
                backpack: newBackpack,
                currentTechnique: technique.id,
                techniqueComprehension: 0,
                learnedTechniques: c.learnedTechniques.includes(technique.id)
                  ? c.learnedTechniques
                  : [...c.learnedTechniques, technique.id],
              }
            : c
        ),
      },
    }))
    return true
  },

  switchTechnique: (characterId, techniqueId) => {
    const { sect } = get()
    const char = sect.characters.find((c) => c.id === characterId)
    if (!char) return false

    if (!char.learnedTechniques.includes(techniqueId)) return false

    set((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) =>
          c.id === characterId
            ? {
                ...c,
                currentTechnique: techniqueId,
                techniqueComprehension: 0,
              }
            : c
        ),
      },
    }))
    return true
  },

  // ---- Building management ----

  upgradeBuilding: (type) => {
    const { sect } = get()
    const building = sect.buildings.find((b) => b.type === type)
    if (!building || !building.unlocked) return false

    const def = BUILDING_DEFS.find((d) => d.type === type)
    if (!def || building.level >= def.maxLevel) return false

    const cost = def.upgradeCost(building.level)
    if (sect.resources.spiritStone < cost.spiritStone) return false

    set((s) => ({
      sect: {
        ...s.sect,
        buildings: s.sect.buildings.map((b) =>
          b.type === type ? { ...b, level: b.level + 1 } : b
        ),
        resources: {
          ...s.sect.resources,
          spiritStone: s.sect.resources.spiritStone - cost.spiritStone,
        },
      },
    }))
    return true
  },

  tryUpgradeBuilding: (type) => {
    const { sect } = get()

    // Check unlock first
    const building = sect.buildings.find((b) => b.type === type)
    if (!building?.unlocked) {
      const unlockCheck = checkBuildingUnlock(type, sect.buildings)
      if (!unlockCheck.unlocked) return { success: false, reason: unlockCheck.reason }
      // Try to unlock
      set((s) => ({
        sect: {
          ...s.sect,
          buildings: s.sect.buildings.map((b) =>
            b.type === type ? { ...b, unlocked: true } : b
          ),
        },
      }))
    }

    // Check upgrade feasibility
    const check = canUpgradeBuilding(type, get().sect.buildings, get().sect.resources.spiritStone)
    if (!check.canUpgrade) return { success: false, reason: check.reason }

    // Perform upgrade
    const success = get().upgradeBuilding(type)
    return { success, reason: '' }
  },

  setProductionRecipe: (buildingType, recipeId) => {
    const { sect } = get()
    const building = sect.buildings.find((b) => b.type === buildingType)
    if (!building || !building.unlocked) return
    if (recipeId !== null && !canStartRecipe(recipeId, building.level)) return
    set((state) => ({
      sect: {
        ...state.sect,
        buildings: state.sect.buildings.map((b) =>
          b.type === buildingType
            ? { ...b, productionQueue: { recipeId, progress: 0 } }
            : b
        ),
      },
    }))
  },

  // ---- Item transfer ----

  transferItemToCharacter: (characterId, vaultIndex) => {
    const { sect } = get()
    const char = sect.characters.find((c) => c.id === characterId)
    if (!char) return false

    if (char.backpack.length >= char.maxBackpackSlots) return false

    const item = sect.vault[vaultIndex]
    if (!item) return false

    set((s) => ({
      sect: {
        ...s.sect,
        vault: s.sect.vault.filter((_, i) => i !== vaultIndex),
        characters: s.sect.characters.map((c) =>
          c.id === characterId
            ? { ...c, backpack: [...c.backpack, item] }
            : c
        ),
      },
    }))
    return true
  },

  transferItemToVault: (characterId, backpackIndex) => {
    const { sect } = get()
    const char = sect.characters.find((c) => c.id === characterId)
    if (!char) return false

    if (sect.vault.length >= sect.maxVaultSlots) return false

    const item = char.backpack[backpackIndex]
    if (!item) return false

    set((s) => ({
      sect: {
        ...s.sect,
        vault: [...s.sect.vault, item],
        characters: s.sect.characters.map((c) =>
          c.id === characterId
            ? { ...c, backpack: c.backpack.filter((_, i) => i !== backpackIndex) }
            : c
        ),
      },
    }))
    return true
  },

  addToVault: (item) => {
    const { sect } = get()
    if (sect.vault.length >= sect.maxVaultSlots) return false
    set((s) => ({
      sect: { ...s.sect, vault: [...s.sect.vault, item] },
    }))
    return true
  },

  sellItem: (vaultIndex) => {
    const { sect } = get()
    const item = sect.vault[vaultIndex]
    if (!item) return false

    set((s) => ({
      sect: {
        ...s.sect,
        vault: s.sect.vault.filter((_, i) => i !== vaultIndex),
        resources: {
          ...s.sect.resources,
          spiritStone: s.sect.resources.spiritStone + item.sellPrice,
        },
      },
    }))
    return true
  },

  removeVaultItem: (vaultIndex) => {
    const { sect } = get()
    const item = sect.vault[vaultIndex]
    if (!item) return null

    set((s) => ({
      sect: { ...s.sect, vault: s.sect.vault.filter((_, i) => i !== vaultIndex) },
    }))
    return item
  },

  // ---- Character inventory ----

  equipItem: (characterId, backpackIndex, slotIndex) => {
    const { sect } = get()
    const char = sect.characters.find((c) => c.id === characterId)
    if (!char) return false

    const item = char.backpack[backpackIndex]
    if (!item || item.type !== 'equipment') return false

    // Ensure equippedGear array has enough slots
    const gear = [...char.equippedGear]
    while (gear.length <= slotIndex) gear.push(null)

    // If there's already something in that slot, swap it to backpack
    const prevGearId = gear[slotIndex]
    const newBackpack = [...char.backpack]
    newBackpack.splice(backpackIndex, 1)
    if (prevGearId) {
      const prevItem = findEquipmentById(sect, prevGearId)
      if (prevItem) newBackpack.push(prevItem)
    }

    gear[slotIndex] = item.id

    set((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) =>
          c.id === characterId
            ? { ...c, backpack: newBackpack, equippedGear: gear }
            : c
        ),
      },
    }))
    return true
  },

  unequipItem: (characterId, slotIndex) => {
    const { sect } = get()
    const char = sect.characters.find((c) => c.id === characterId)
    if (!char) return false

    const gear = [...char.equippedGear]
    if (slotIndex < 0 || slotIndex >= gear.length) return false

    const gearId = gear[slotIndex]
    if (!gearId) return false

    // Find the equipment
    const equipment = findEquipmentById(sect, gearId)
    if (!equipment) return false

    // Check backpack space
    if (char.backpack.length >= char.maxBackpackSlots) return false

    gear[slotIndex] = null

    set((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) =>
          c.id === characterId
            ? { ...c, equippedGear: gear, backpack: [...c.backpack, equipment] }
            : c
        ),
      },
    }))
    return true
  },

  enhanceItem: (characterId, backpackIndex) => {
    const { sect } = get()
    const char = sect.characters.find((c) => c.id === characterId)
    if (!char) {
      return { success: false, newLevel: 0, cost: { spiritStone: 0, ore: 0 } }
    }

    const item = char.backpack[backpackIndex]
    if (!item || item.type !== 'equipment') {
      return { success: false, newLevel: 0, cost: { spiritStone: 0, ore: 0 } }
    }

    const forgeLevel = getBuildingLevel(sect.buildings, 'forge')
    const forgeBuff = getForgeBuff(forgeLevel)
    const result = attemptEnhance(item, forgeBuff.successBonus, forgeBuff.costReduction)

    // Check if we have enough resources
    if (sect.resources.spiritStone < result.cost.spiritStone) {
      return { success: false, newLevel: item.enhanceLevel, cost: result.cost }
    }
    if (sect.resources.ore < result.cost.ore) {
      return { success: false, newLevel: item.enhanceLevel, cost: result.cost }
    }

    // Spend resources
    set((s) => ({
      sect: {
        ...s.sect,
        resources: {
          ...s.sect.resources,
          spiritStone: s.sect.resources.spiritStone - result.cost.spiritStone,
          ore: s.sect.resources.ore - result.cost.ore,
        },
      },
    }))

    // Update item if enhancement succeeded
    if (result.success) {
      const newBackpack = [...get().sect.characters.find((c) => c.id === characterId)!.backpack]
      newBackpack[backpackIndex] = { ...item, enhanceLevel: result.newLevel }
      set((s) => ({
        sect: {
          ...s.sect,
          characters: s.sect.characters.map((c) =>
            c.id === characterId ? { ...c, backpack: newBackpack } : c
          ),
        },
      }))
    }

    return result
  },

  sellCharacterItem: (characterId, backpackIndex) => {
    const { sect } = get()
    const char = sect.characters.find((c) => c.id === characterId)
    if (!char) return false

    const item = char.backpack[backpackIndex]
    if (!item) return false

    set((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) =>
          c.id === characterId
            ? { ...c, backpack: c.backpack.filter((_, i) => i !== backpackIndex) }
            : c
        ),
        resources: {
          ...s.sect.resources,
          spiritStone: s.sect.resources.spiritStone + item.sellPrice,
        },
      },
    }))
    return true
  },

  // ---- Healing ----

  healCharacter: (characterId) => {
    const { sect } = get()
    const char = sect.characters.find((c) => c.id === characterId)
    if (!char) return false
    if (char.status !== 'injured') return false
    if (sect.resources.herb < 2) return false

    set((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) =>
          c.id === characterId
            ? { ...c, status: 'cultivating', injuryTimer: 0 }
            : c
        ),
        resources: {
          ...s.sect.resources,
          herb: s.sect.resources.herb - 2,
        },
      },
    }))
    return true
  },

  // ---- Resource operations ----

  spendResource: (type, amount) => {
    const { sect } = get()
    if (sect.resources[type] < amount) return false
    set((s) => ({
      sect: {
        ...s.sect,
        resources: { ...s.sect.resources, [type]: s.sect.resources[type] - amount },
      },
    }))
    return true
  },

  addResource: (type, amount) => {
    set((s) => ({
      sect: {
        ...s.sect,
        resources: { ...s.sect.resources, [type]: s.sect.resources[type] + amount },
      },
    }))
  },

  // ---- Market exchange ----

  exchangeResources: (from, to, amount) => {
    const { sect } = get()

    // Validate exchange direction
    const supportedPairs: Array<[ResourceType, ResourceType]> = [
      ['spiritStone', 'herb'],
      ['spiritStone', 'ore'],
      ['herb', 'spiritStone'],
      ['ore', 'spiritStone'],
    ]
    const isValid = supportedPairs.some(([f, t]) => f === from && t === to)
    if (!isValid) {
      return { success: false, reason: '不支持该兑换方向' }
    }

    // Check source resource
    if (sect.resources[from] < amount) {
      return { success: false, reason: '资源不足' }
    }

    // Calculate market level and loss rate
    const marketLevel = sect.buildings.find(b => b.type === 'market')?.level ?? 0
    const lossRate = Math.max(0.3, 0.667 - 0.05 * marketLevel)

    // Calculate received amount
    let received: number
    if (from === 'spiritStone') {
      // Buying: 1 spiritStone -> 2 herb/ore
      received = amount * 2
    } else {
      // Selling: herb/ore -> spiritStone with loss
      received = Math.floor(amount / 3 * (1 - lossRate))
    }

    // Deduct source, add received
    set((s) => ({
      sect: {
        ...s.sect,
        resources: {
          ...s.sect.resources,
          [from]: s.sect.resources[from] - amount,
          [to]: s.sect.resources[to] + received,
        },
      },
    }))

    return { success: true, received }
  },

  // ---- Breakthrough ----

  attemptBreakthrough: (characterId) => {
    const { sect } = get()
    const char = sect.characters.find((c) => c.id === characterId)
    if (!char) {
      return { success: false, newRealm: 0, newStage: 0, statsChanged: false }
    }

    if (!canBreakthrough(char)) {
      return { success: false, newRealm: char.realm, newStage: char.realmStage, statsChanged: false }
    }

    // Check if this is a major realm breakthrough (at max stage of current realm)
    const realmDef = REALMS[char.realm]
    const isMajorRealm = char.realmStage >= realmDef.stages.length - 1
    if (isMajorRealm) {
      const targetRealm = char.realm + 1
      const cost = BREAKTHROUGH_COSTS[targetRealm]
      if (cost) {
        // Check spiritStone
        if (sect.resources.spiritStone < cost.spiritStone) {
          return { success: false, newRealm: char.realm, newStage: char.realmStage, statsChanged: false }
        }
        // Find pill in vault by recipeId
        const pillIndex = sect.vault.findIndex(
          (item) => item.type === 'consumable' && (item as any).recipeId === cost.pillId
        )
        if (pillIndex === -1) {
          return { success: false, newRealm: char.realm, newStage: char.realmStage, statsChanged: false }
        }

        // Consume pill and spiritStone
        const newVault = sect.vault.filter((_, i) => i !== pillIndex)
        set((s) => ({
          sect: {
            ...s.sect,
            vault: newVault,
            resources: {
              ...s.sect.resources,
              spiritStone: s.sect.resources.spiritStone - cost.spiritStone,
            },
          },
        }))
      }
    }

    // Get technique if character has one
    let technique: Technique | null = null
    if (char.currentTechnique) {
      technique = getTechniqueById(char.currentTechnique) ?? null
    }

    const result = performBreakthrough(char, technique)
    if (!result.success) {
      return { success: false, newRealm: char.realm, newStage: char.realmStage, statsChanged: false }
    }

    const statsChanged =
      result.newStats.hp !== result.oldStats.hp ||
      result.newStats.atk !== result.oldStats.atk ||
      result.newStats.def !== result.oldStats.def ||
      result.newStats.spd !== result.oldStats.spd

    set((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) =>
          c.id === characterId
            ? {
                ...c,
                realm: result.newRealm,
                realmStage: result.newStage,
                cultivation: 0,
                baseStats: result.newStats,
              }
            : c
        ),
        totalBreakthroughs: s.sect.totalBreakthroughs + 1,
      },
    }))

    return { success: true, newRealm: result.newRealm, newStage: result.newStage, statsChanged }
  },

  // ---- Main tick ----

  tickAll: (deltaSec) => {
    const { sect } = get()

    // 1. Calculate building levels
    const sfLevel = sect.buildings.find((b) => b.type === 'spiritField')?.level ?? 0
    const smLevel = sect.buildings.find((b) => b.type === 'spiritMine')?.level ?? 0
    const mhLevel = sect.buildings.find((b) => b.type === 'mainHall')?.level ?? 0

    // 2. Calculate resource caps
    const caps = calcResourceCaps(sfLevel, smLevel)

    // 3. Calculate technique multiplier from best cultivating character
    const maxTechRate = sect.characters
      .filter((c) => c.status === 'cultivating' && c.currentTechnique)
      .reduce((max, c) => {
        const tech = getTechniqueById(c.currentTechnique!)
        if (!tech) return max
        const rate = calcCultivationRate(c, tech)
        // Normalize: divide by base rate (BASE_CULTIVATION_RATE=5 * rootBonus * realmMult)
        // We want just the technique bonus multiplier, so compute with and without tech
        const baseRate = calcCultivationRate(c, null)
        if (baseRate === 0) return max
        return Math.max(max, rate / baseRate)
      }, 1)
    const bonuses: ProductionBonuses = { techniqueMultiplier: maxTechRate, discipleMultiplier: 1 }

    // 4. Calculate resource rates with production bonuses
    const rates = calcResourceRates(
      { spiritField: sfLevel, spiritMine: smLevel, mainHall: mhLevel },
      bonuses,
    )

    const spiritProduced = rates.spiritEnergy * deltaSec

    // 5. Process production queues (before cultivation loop)
    const newBuildings = sect.buildings.map((b) => ({ ...b, productionQueue: { ...b.productionQueue } }))
    const newVault = [...sect.vault]
    const processingTypes: BuildingType[] = ['alchemyFurnace', 'forge']
    const totalConsumed = { spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0 }
    const USE_OFFLINE_THRESHOLD = 60

    for (const bType of processingTypes) {
      const building = newBuildings.find((b) => b.type === bType)
      if (!building || !building.unlocked || building.level === 0 || !building.productionQueue.recipeId) continue
      const vaultFreeSlots = sect.maxVaultSlots - newVault.length
      if (deltaSec >= USE_OFFLINE_THRESHOLD) {
        const offlineResult = calcOfflineProduction(building.productionQueue, sect.resources, deltaSec, vaultFreeSlots)
        totalConsumed.spiritStone += offlineResult.consumed.spiritStone
        totalConsumed.spiritEnergy += offlineResult.consumed.spiritEnergy
        totalConsumed.herb += offlineResult.consumed.herb
        totalConsumed.ore += offlineResult.consumed.ore
        for (let i = 0; i < offlineResult.itemsProduced; i++) {
          const recipe = getAutoRecipeById(building.productionQueue.recipeId!)
          if (recipe) {
            const item = produceItemFromRecipe(recipe, building.level)
            if (item && newVault.length < sect.maxVaultSlots) newVault.push(item)
          }
        }
      } else {
        const vaultFull = newVault.length >= sect.maxVaultSlots
        const result = tickProductionQueue(building.productionQueue, sect.resources, deltaSec, vaultFull)
        totalConsumed.spiritStone += result.consumed.spiritStone
        totalConsumed.spiritEnergy += result.consumed.spiritEnergy
        totalConsumed.herb += result.consumed.herb
        totalConsumed.ore += result.consumed.ore
        building.productionQueue.progress = result.progress
        if (result.completed) {
          const recipe = getAutoRecipeById(building.productionQueue.recipeId!)
          if (recipe && newVault.length < sect.maxVaultSlots) {
            const item = produceItemFromRecipe(recipe, building.level)
            if (item) newVault.push(item)
          }
        }
      }
    }

    // 6. Count cultivating characters
    const cultivatingCount = sect.characters.filter((c) => c.status === 'cultivating').length
    const spiritConsumed = cultivatingCount * 2 * deltaSec

    // 7. Spirit ratio
    let spiritRatio = 1
    if (cultivatingCount > 0) {
      spiritRatio = Math.min(1, (sect.resources.spiritEnergy + spiritProduced) / spiritConsumed)
    }

    // 8. Add spirit energy
    let updatedSpiritEnergy = sect.resources.spiritEnergy + spiritProduced

    // 9. Calculate building multipliers
    const trainingMult = getTrainingSpeedMult(sect.buildings)
    const compMult = getComprehensionSpeedMult(sect.buildings)

    // 10. Process each cultivating character
    const updatedCharacters = sect.characters.map((char) => {
      if (char.status !== 'cultivating') {
        // Handle resting/injured characters
        if (char.status === 'injured' || char.status === 'resting') {
          // Reduce injuryTimer (reused as recovery timer for resting)
          const newTimer = Math.max(0, char.injuryTimer - deltaSec)
          if (newTimer <= 0) {
            return { ...char, status: 'cultivating' as const, injuryTimer: 0 }
          }
          return { ...char, injuryTimer: newTimer }
        }
        return char
      }

      const effectiveSpirit = 2 * spiritRatio * deltaSec
      const charTechnique = char.currentTechnique ? getTechniqueById(char.currentTechnique) ?? null : null
      const result = cultivationTick(char, effectiveSpirit, deltaSec, charTechnique)
      const gained = result.cultivationGained * trainingMult

      let updatedChar: Character = {
        ...char,
        cultivation: char.cultivation + gained,
        totalCultivation: char.totalCultivation + gained,
      }

      // Deduct spirit energy
      updatedSpiritEnergy -= effectiveSpirit

      // Tick comprehension if character has a technique
      if (updatedChar.currentTechnique) {
        const technique = getTechniqueById(updatedChar.currentTechnique)
        if (technique && updatedChar.techniqueComprehension < 100) {
          const compResult = tickComprehension(updatedChar, technique, deltaSec)
          updatedChar = {
            ...updatedChar,
            techniqueComprehension: Math.max(0, Math.min(100, updatedChar.techniqueComprehension + compResult.gained * compMult)),
          }

          // If comprehension reaches 100 and technique not yet in learnedTechniques, add it
          if (updatedChar.techniqueComprehension >= 100 && !updatedChar.learnedTechniques.includes(technique.id)) {
            updatedChar = {
              ...updatedChar,
              learnedTechniques: [...updatedChar.learnedTechniques, technique.id],
            }
          }
        }
      }

      return updatedChar
    })

    // 11. Recalculate sect level from mainHall building level
    const mainHallLevel = updatedCharacters.length > 0
      ? get().sect.buildings.find((b) => b.type === 'mainHall')?.level ?? 1
      : 1
    const newSectLevel = calcSectLevel(mainHallLevel)

    // 12. Build new sect with updated resources (production + cultivation - consumed)
    const newResources = {
      spiritEnergy: updatedSpiritEnergy,
      spiritStone: sect.resources.spiritStone + rates.spiritStone * deltaSec - totalConsumed.spiritStone,
      herb: sect.resources.herb + rates.herb * deltaSec - totalConsumed.herb,
      ore: sect.resources.ore + rates.ore * deltaSec - totalConsumed.ore,
    }

    // 13. Clamp resources to caps
    const clampedResources = clampResources(newResources, caps)

    // Build the updated sect for the set call
    const newSect = {
      ...sect,
      characters: updatedCharacters,
      resources: clampedResources,
      buildings: newBuildings,
      vault: newVault,
      level: newSectLevel,
    }

    set({
      sect: newSect,
    })

    return {
      spiritProduced,
      spiritConsumed: cultivatingCount > 0 ? Math.min(spiritConsumed, spiritProduced + sect.resources.spiritEnergy) : 0,
    }
  },

  // ---- Building feature actions ----

  craftPotion: (recipeId) => {
    const { sect } = get()
    const furnaceLevel = sect.buildings.find(b => b.type === 'alchemyFurnace')?.level ?? 0
    const recipe = ALCHEMY_RECIPES.find(r => r.id === recipeId)
    if (!recipe) return { success: false, reason: '未知丹方' }
    if (!canCraftAlchemy(recipe, { herb: sect.resources.herb, spiritStone: sect.resources.spiritStone }, furnaceLevel))
      return { success: false, reason: '资源或等级不足' }
    const potion = craftPotionAlchemy(recipe, furnaceLevel)
    if (!potion) return { success: false, reason: '炼制失败' }
    // Deduct resources
    set(s => ({ sect: { ...s.sect, resources: { ...s.sect.resources, herb: s.sect.resources.herb - recipe.cost.herb, spiritStone: s.sect.resources.spiritStone - (recipe.cost.spiritStone ?? 0) } } }))
    // Add to vault
    get().addToVault(potion)
    return { success: true, reason: '' }
  },

  forgeEquipment: (recipeId) => {
    const { sect } = get()
    const forgeLevel = sect.buildings.find(b => b.type === 'forge')?.level ?? 0
    const recipe = FORGE_RECIPES.find(r => r.id === recipeId)
    if (!recipe) return { success: false, reason: '未知配方' }
    if (!canForge(recipe, { ore: sect.resources.ore, spiritStone: sect.resources.spiritStone }, forgeLevel))
      return { success: false, reason: '资源或等级不足' }
    const { successBonus } = getForgeBuff(forgeLevel)
    // Deduct resources first
    set(s => ({ sect: { ...s.sect, resources: { ...s.sect.resources, ore: s.sect.resources.ore - recipe.cost.ore, spiritStone: s.sect.resources.spiritStone - recipe.cost.spiritStone } } }))
    const item = forgeEquipmentSystem(recipe, forgeLevel, successBonus)
    if (!item) return { success: false, reason: '锻造失败' }
    get().addToVault(item)
    return { success: true, reason: '' }
  },

  studyTechnique: () => {
    const { sect } = get()
    const scriptureLevel = sect.buildings.find(b => b.type === 'scriptureHall')?.level ?? 0
    if (scriptureLevel < 3) return { success: false, reason: '藏经阁等级不足' }
    const cost = 100 * sect.level
    if (sect.resources.spiritStone < cost) return { success: false, reason: '灵石不足' }
    // Generate scroll matching highest realm among characters
    const maxRealm = Math.max(...sect.characters.map(c => c.realm), 0)
    const tierMap = ['mortal', 'spirit', 'immortal', 'divine', 'chaos'] as const
    const maxTier = tierMap[Math.min(maxRealm, tierMap.length - 1)] ?? 'mortal'
    // Try to generate, fallback to mortal if no techniques at tier
    let scroll: ReturnType<typeof generateRandomTechniqueScroll>
    try { scroll = generateRandomTechniqueScroll(maxTier) } catch { scroll = generateRandomTechniqueScroll('mortal') }
    // Deduct resources
    set(s => ({ sect: { ...s.sect, resources: { ...s.sect.resources, spiritStone: s.sect.resources.spiritStone - cost } } }))
    get().addToVault(scroll)
    return { success: true, reason: '' }
  },

  groupTransmission: () => {
    const { sect } = get()
    const trainingHall = sect.buildings.find(b => b.type === 'trainingHall')
    if (!trainingHall || trainingHall.level < 3) return { success: false, reason: '传功殿等级不足（需要Lv3）', charactersUpdated: 0 }

    // Check cooldown (60 seconds)
    if (Date.now() - sect.lastTransmissionTime < 60000) {
      const remaining = Math.ceil((60000 - (Date.now() - sect.lastTransmissionTime)) / 1000)
      return { success: false, reason: `传功冷却中（${remaining}秒）`, charactersUpdated: 0 }
    }

    // Count cultivating characters
    const cultivatingChars = sect.characters.filter(c => c.status === 'cultivating')
    if (cultivatingChars.length === 0) return { success: false, reason: '没有修炼中的弟子', charactersUpdated: 0 }

    const cost = 50 * cultivatingChars.length
    if (sect.resources.spiritEnergy < cost) return { success: false, reason: `灵气不足（需要${cost}）`, charactersUpdated: 0 }

    // Apply cultivation boost to each cultivating character
    const updatedCharacters = sect.characters.map(char => {
      if (char.status !== 'cultivating') return char

      // Calculate next realm cultivation requirement
      let nextRealm = char.realm
      let nextStage = char.realmStage + 1
      if (nextStage > 3) {
        nextRealm++
        nextStage = 0
      }
      // Check if at max realm
      if (nextRealm >= REALMS.length) return char

      const nextRealmDef = REALMS[nextRealm]
      if (!nextRealmDef) return char
      const needed = nextRealmDef.cultivationCosts[nextStage]
      if (needed == null || !isFinite(needed)) return char

      const boost = Math.floor(needed * 0.1)
      return {
        ...char,
        cultivation: char.cultivation + boost,
        totalCultivation: char.totalCultivation + boost,
      }
    })

    // Deduct spirit energy and update timestamp
    set(s => ({
      sect: {
        ...s.sect,
        characters: updatedCharacters,
        resources: {
          ...s.sect.resources,
          spiritEnergy: s.sect.resources.spiritEnergy - cost,
        },
        lastTransmissionTime: Date.now(),
      },
    }))

    return { success: true, reason: '', charactersUpdated: cultivatingChars.length }
  },

  targetedRecruit: (minQuality) => {
    const { sect } = get()
    const recruitmentPavilion = sect.buildings.find(b => b.type === 'recruitmentPavilion')
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
    let character: Character | null = null
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
    set(s => ({
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

  // ---- Pet management ----

  addPet: (pet) => {
    set((s) => ({
      sect: { ...s.sect, pets: [...s.sect.pets, pet] },
    }))
  },

  removePet: (petId) => {
    set((s) => ({
      sect: {
        ...s.sect,
        pets: s.sect.pets.filter((p) => p.id !== petId),
        // Also unassign from any character
        characters: s.sect.characters.map((c) => ({
          ...c,
          petIds: c.petIds.filter((id) => id !== petId),
        })),
      },
    }))
  },

  assignPet: (characterId, petId) => {
    const { sect } = get()
    const char = sect.characters.find((c) => c.id === characterId)
    if (!char) return false

    const petExists = sect.pets.some((p) => p.id === petId)
    if (!petExists) return false

    if (char.petIds.includes(petId)) return true // already assigned

    set((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) =>
          c.id === characterId
            ? { ...c, petIds: [...c.petIds, petId] }
            : c
        ),
      },
    }))
    return true
  },

  unassignPet: (characterId, petId) => {
    set((s) => ({
      sect: {
        ...s.sect,
        characters: s.sect.characters.map((c) =>
          c.id === characterId
            ? { ...c, petIds: c.petIds.filter((id) => id !== petId) }
            : c
        ),
      },
    }))
  },

  // ---- Reset ----

  reset: () => set({ ...createInitialState(), shopState: null }),
}))
