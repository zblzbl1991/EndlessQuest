import type { Character } from '../../types/character'
import type { Equipment, ItemStack } from '../../types/item'
import { EQUIP_SLOTS } from '../../data/items'
import { getEquipmentRecommendationForCharacter, getSlotIndex, calcEquipmentStats } from './EquipmentEngine'

export interface AutoEquipAssignment {
  slotIndex: number
  itemId: string
}

export interface AutoEquipResult {
  /** charId -> list of { slotIndex, itemId } */
  assignments: Record<string, AutoEquipAssignment[]>
}

/**
 * Pure function: plan optimal equipment assignment for a dungeon team.
 * Greedy approach — for each character, for each slot, pick the highest-scoring
 * unclaimed vault item. Returns a plan but does NOT mutate any state.
 */
export function autoEquipForDungeon(
  characterIds: string[],
  characters: Character[],
  vault: ItemStack[]
): AutoEquipResult {
  const assignments: Record<string, AutoEquipAssignment[]> = {}
  const claimedItemIds = new Set<string>()

  for (const charId of characterIds) {
    const character = characters.find((c) => c.id === charId)
    if (!character) continue

    const charAssignments: AutoEquipAssignment[] = []

    for (const slot of EQUIP_SLOTS) {
      const slotIndex = getSlotIndex(slot)

      // Skip if character already has gear in this slot
      if (character.equippedGear[slotIndex]) continue

      // Find best available equipment for this slot
      let bestItem: Equipment | null = null
      let bestScore = -Infinity

      for (const stack of vault) {
        if (stack.item.type !== 'equipment') continue
        const eq = stack.item as Equipment
        if (eq.slot !== slot) continue
        if (claimedItemIds.has(eq.id)) continue

        const rec = getEquipmentRecommendationForCharacter(character, eq)
        if (rec.score > bestScore) {
          bestScore = rec.score
          bestItem = eq
        }
      }

      if (bestItem && bestScore > 0) {
        claimedItemIds.add(bestItem.id)
        charAssignments.push({ slotIndex, itemId: bestItem.id })
      }
    }

    if (charAssignments.length > 0) {
      assignments[charId] = charAssignments
    }
  }

  return { assignments }
}

/**
 * Compute equipment stats for a character that already has gear equipped.
 * Uses the character's equippedGear and a lookup function to find equipment by ID.
 */
export function calcCharacterEquipmentStats(
  character: Character,
  findEquipmentById: (id: string) => Equipment | undefined
) {
  return calcEquipmentStats(character.equippedGear, [], findEquipmentById)
}
