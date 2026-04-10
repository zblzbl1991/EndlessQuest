import type {
  Character,
  CharacterTitle,
  CharacterQuality,
  CharacterStatus,
  CultivationPath,
} from '../../types/character'
import type {
  SectPath,
  BuildingType,
  Resources,
  ResourceType,
  Sect,
  AnyItem,
  ItemStack,
  SectAutomationSettings,
} from '../../types'
import type { ItemQuality } from '../../types/item'
import type { ShopState } from '../../systems/trade/TradeSystem'
import type { SectRouteDef, SectRouteId } from '../../data/sectRoutes'
import type { SectRiskPolicyId, SectRiskPolicyProfile } from '../../types/destiny'

export interface CharacterSacrificeContext {
  source: 'adventure' | 'breakthrough'
  reason: string
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
  addCharacter(): Character | null
  canRecruit(): { allowed: boolean; reason: string }
  removeCharacter(id: string): void
  sacrificeCharacter(id: string, context: CharacterSacrificeContext): boolean
  promoteCharacter(id: string, newTitle: CharacterTitle): void
  setCharacterStatus(id: string, status: CharacterStatus, opts?: { injuryTimer?: number }): void
  setCharacterRecovering(id: string, recoveryDays: number): void
  chooseCultivationPath(id: string, path: Exclude<CultivationPath, 'none'>): boolean
  updateCharacterSkill(characterId: string, slotIndex: number, skillId: string | null): void
  setAutomationSettings(patch: Partial<SectAutomationSettings>): void

  // Technique management
  unlockCodexEntry(techniqueId: string): boolean
  unlockCodexAndLearn(techniqueId: string, characterId: string): boolean

  // Building management
  upgradeBuilding(type: BuildingType): boolean
  tryUpgradeBuilding(type: BuildingType): { success: boolean; reason: string }
  expandBuilding(type: BuildingType): boolean
  tryExpandBuilding(type: BuildingType): { success: boolean; reason: string }
  setProductionRecipe(buildingType: BuildingType, recipeId: string | null): void
  autoAssignToBuilding(buildingType: string): { success: boolean; assigned: number; reason: string }
  autoOptimizeBuildingAssignments(): { success: boolean; assigned: number; reason: string }

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

  // Sect path
  chooseSectPath(path: SectPath): void
  unlockPathNode(nodeId: string): boolean
  resetSectPath(): void
  setActiveRoute(routeId: SectRouteId | null): void
  getActiveRouteEffects(): SectRouteDef | null

  // Legacy ascension
  performAscension(): void

  // Strategy
  setPolicy(policyId: SectRiskPolicyId): { success: boolean; reason: string }
  getActivePolicy(): SectRiskPolicyProfile | null
  getCoreDiscipleIds(): string[]

  // Codex
  encounterMonster(enemyId: string): void
  killMonster(enemyId: string): void
  discoverEquipment(setId: string, quality: ItemQuality): void

  reset(): void
}
