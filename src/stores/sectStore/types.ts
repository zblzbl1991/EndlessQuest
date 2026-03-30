import type { Character, CharacterTitle, CharacterQuality, CharacterStatus } from '../../types/character'
import type {
  BuildingType,
  Resources,
  ResourceType,
  Sect,
  AnyItem,
  Equipment,
  Consumable,
  ItemStack,
} from '../../types'
import type { ShopState } from '../../systems/trade/TradeSystem'

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
  unlockCodexEntry(techniqueId: string): boolean
  unlockCodexAndLearn(techniqueId: string, characterId: string): boolean

  // Building management
  upgradeBuilding(type: BuildingType): boolean
  tryUpgradeBuilding(type: BuildingType): { success: boolean; reason: string }
  setProductionRecipe(buildingType: BuildingType, recipeId: string | null): void

  // Item transfer
  transferItemToCharacter(characterId: string, vaultIndex: number): boolean
  transferItemToVault(characterId: string, backpackIndex: number): boolean
  addToVault(item: AnyItem): boolean
  sellItem(vaultIndex: number): boolean
  removeVaultItem(vaultIndex: number): ItemStack | null

  // Character inventory
  equipItem(characterId: string, backpackIndex: number, slotIndex: number): boolean
  unequipItem(characterId: string, slotIndex: number): boolean
  enhanceItem(
    characterId: string,
    backpackIndex: number
  ): { success: boolean; newLevel: number; cost: { spiritStone: number; ore: number } }
  sellCharacterItem(characterId: string, backpackIndex: number): boolean

  // Healing
  healCharacter(characterId: string): boolean

  // Resource operations (GLOBAL UNIQUE)
  spendResource(type: keyof Resources, amount: number): boolean
  addResource(type: keyof Resources, amount: number): void

  // Market exchange
  exchangeResources(
    from: ResourceType,
    to: ResourceType,
    amount: number
  ): { success: boolean; received?: number; reason?: string }

  // Main tick (called every second)
  tickAll(deltaSec: number): { spiritProduced: number; spiritConsumed: number }

  // Building feature actions
  craftPotion(recipeId: string): { success: boolean; reason: string }
  forgeEquipment(recipeId: string): { success: boolean; reason: string }
  studyTechnique(): { success: boolean; reason: string }
  targetedRecruit(minQuality: CharacterQuality): Character | null

  // Pet management
  addPet(pet: import('../../systems/pet/PetSystem').Pet): void
  removePet(petId: string): void
  assignPet(characterId: string, petId: string): boolean
  unassignPet(characterId: string, petId: string): void

  // Building assignment
  assignToBuilding(characterId: string, buildingType: string): void
  unassignFromBuilding(characterId: string): void

  // Offline report
  clearOfflineAccumulator(): void

  reset(): void
}
