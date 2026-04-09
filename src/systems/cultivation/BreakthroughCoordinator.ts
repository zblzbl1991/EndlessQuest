import type { Character } from '../../types/character'
import { canBreakthrough, breakthrough as performBreakthrough, calcBreakthroughFailureRate } from './CultivationEngine'
import { shouldTriggerTribulation, resolveTribulation } from './TribulationSystem'
import { tryComprehendOnBreakthrough } from '../technique/TechniqueSystem'
import { REALMS, getBreakthroughResourceCost, getRealmName } from '../../data/realms'
import { getTechniqueById } from '../../data/techniquesTable'
import { needsCultivationPathChoice } from '../character/CultivationPathSystem'
import type { PathEffectMap } from '../sect/SectPathEffects'
import { getMultEffect } from '../sect/SectPathEffects'

/**
 * Seed initial comprehension when a new technique is learned.
 * Dungeon-found techniques start at 15%.
 */
function seedComprehension(existingComprehension: Record<string, number>, techniqueId: string): Record<string, number> {
  const technique = getTechniqueById(techniqueId)
  const starterComp = technique?.origin === 'starter' ? 30 : 15
  return { ...existingComprehension, [techniqueId]: starterComp }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BreakthroughCost {
  spiritStone: number
  spiritEnergy: number
}

export interface BreakthroughEvent {
  type: 'breakthrough_success' | 'breakthrough_failure' | 'breakthrough_comprehension'
  message: string
}

export interface BreakthroughResult {
  /** The character after breakthrough attempt (may have new realm/stage, or be unchanged) */
  updatedChar: Character
  /** Events to emit */
  events: BreakthroughEvent[]
  /** Resource costs consumed (only if breakthrough was attempted) */
  resourceCost: BreakthroughCost
  /** Whether the breakthrough resulted in character death */
  died: boolean
  /** Comprehended technique ID (if breakthrough triggered comprehension) */
  comprehendedTechniqueId: string | null
  /** Number of breakthrough attempts made */
  attemptsCount: number
  /** Number of successful breakthroughs */
  successesCount: number
  /** Whether a tribulation success milestone was unlocked */
  unlockedTribulationMilestone: boolean
  /** Target realm name for the breakthrough attempt (used for offline accumulator tracking) */
  targetRealmName: string | null
  /** Whether the breakthrough was successful (used for offline accumulator tracking) */
  breakthroughSuccess: boolean | null
}

// ---------------------------------------------------------------------------
// processBreakthrough — pure function extracted from tickSlice
// ---------------------------------------------------------------------------

/**
 * Process a breakthrough attempt for a character.
 *
 * Pure function: takes character + resources + context, returns result.
 * Does NOT emit events or mutate store state -- caller applies results.
 *
 * Handles three paths:
 * 1. Needs cultivation path choice -> skip (return unchanged)
 * 2. Major realm breakthrough (with or without tribulation)
 * 3. Sub-level breakthrough
 */
export function processBreakthrough(
  char: Character,
  availableSpiritStone: number,
  availableSpiritEnergy: number,
  techniqueCodex: string[],
  currentCostAccumulator: { spiritStone: number; spiritEnergy: number },
  pathEffects?: PathEffectMap
): BreakthroughResult {
  const noChange: BreakthroughResult = {
    updatedChar: char,
    events: [],
    resourceCost: { spiritStone: 0, spiritEnergy: 0 },
    died: false,
    comprehendedTechniqueId: null,
    attemptsCount: 0,
    successesCount: 0,
    unlockedTribulationMilestone: false,
    targetRealmName: null,
    breakthroughSuccess: null,
  }

  // Guard: must be able to breakthrough
  if (!canBreakthrough(char)) return noChange

  // If character needs a cultivation path choice, skip breakthrough
  if (needsCultivationPathChoice(char)) return noChange

  // Determine if this is a major realm breakthrough (max stage -> new realm)
  const currentRealm = REALMS[char.realm]
  const isMajorBreakthrough = char.realmStage >= currentRealm.stages.length - 1
  const cost = getBreakthroughResourceCost(char.realm, char.realmStage)

  // Apply sect path breakthroughCost multiplier (e.g. pill path -20%)
  const btCostMult = pathEffects ? getMultEffect(pathEffects, 'breakthroughCost') : 1
  const adjustedSpiritStoneCost = Math.floor(cost.spiritStone * btCostMult)

  if (isMajorBreakthrough) {
    // Major realm transition requires spiritStone
    if (
      availableSpiritStone - currentCostAccumulator.spiritStone < adjustedSpiritStoneCost ||
      availableSpiritEnergy - currentCostAccumulator.spiritEnergy < cost.spiritEnergy
    ) {
      // Cannot breakthrough: insufficient resources
      return noChange
    }

    const resourceCost = { spiritStone: adjustedSpiritStoneCost, spiritEnergy: cost.spiritEnergy }

    if (shouldTriggerTribulation(char.realm, char.realmStage)) {
      // Tribulation path for realms with tribulationPower
      const tribResult = resolveTribulation(char)
      if (tribResult.success) {
        const failureRate = calcBreakthroughFailureRate(char)
        const btResult = performBreakthrough(char, failureRate)
        if (btResult.success) {
          const nextName = getRealmName(btResult.newRealm, btResult.newStage)
          const events: BreakthroughEvent[] = [
            {
              type: 'breakthrough_success',
              message: `天雷散去，${char.name} 气息一变，周身灵力涌动，成功踏入${nextName}！`,
            },
          ]
          let updatedChar: Character = {
            ...char,
            realm: btResult.newRealm,
            realmStage: btResult.newStage,
            cultivation: 0,
            baseStats: btResult.newStats,
          }
          // Breakthrough comprehension (major tribulation)
          const comprehendedId = tryComprehendOnBreakthrough(updatedChar, techniqueCodex, true)
          if (comprehendedId) {
            updatedChar = {
              ...updatedChar,
              learnedTechniques: [...updatedChar.learnedTechniques, comprehendedId],
              techniqueComprehension: seedComprehension(updatedChar.techniqueComprehension ?? {}, comprehendedId),
            }
            const compName = getTechniqueById(comprehendedId)?.name ?? comprehendedId
            events.push({
              type: 'breakthrough_comprehension',
              message: `${updatedChar.name} 豁然开朗，顿悟了 ${compName} 之妙`,
            })
          }
          return {
            updatedChar,
            events,
            resourceCost,
            died: false,
            comprehendedTechniqueId: comprehendedId,
            attemptsCount: 1,
            successesCount: 1,
            unlockedTribulationMilestone: true,
            targetRealmName: nextName,
            breakthroughSuccess: true,
          }
        } else {
          // Breakthrough failed after tribulation success
          const failedName = getRealmName(btResult.newRealm, btResult.newStage)
          return {
            updatedChar: char,
            events: [{ type: 'breakthrough_failure', message: `${char.name} 渡过天劫，却在破关之际力竭，身死道消` }],
            resourceCost,
            died: true,
            comprehendedTechniqueId: null,
            attemptsCount: 1,
            successesCount: 0,
            unlockedTribulationMilestone: false,
            targetRealmName: failedName,
            breakthroughSuccess: false,
          }
        }
      } else {
        // Tribulation failure -> death
        const nextName = getRealmName(char.realm + 1, 0)
        return {
          updatedChar: char,
          events: [
            {
              type: 'breakthrough_failure',
              message: tribResult.severe
                ? `${char.name} 未能扛过天劫，雷光之中当场身死道消`
                : `${char.name} 功力不济，未能渡过天劫，身死道消`,
            },
          ],
          resourceCost,
          died: true,
          comprehendedTechniqueId: null,
          attemptsCount: 0,
          successesCount: 0,
          unlockedTribulationMilestone: false,
          targetRealmName: nextName,
          breakthroughSuccess: false,
        }
      }
    } else {
      // Non-tribulation major breakthrough
      const failureRate = calcBreakthroughFailureRate(char)
      const btResult = performBreakthrough(char, failureRate)
      if (btResult.success) {
        const nextName = getRealmName(btResult.newRealm, btResult.newStage)
        const events: BreakthroughEvent[] = [
          { type: 'breakthrough_success', message: `${char.name} 灵力贯通，气息蜕变，成功突破至 ${nextName}` },
        ]
        let updatedChar: Character = {
          ...char,
          realm: btResult.newRealm,
          realmStage: btResult.newStage,
          cultivation: 0,
          baseStats: btResult.newStats,
        }
        // Breakthrough comprehension (major non-tribulation)
        const comprehendedId = tryComprehendOnBreakthrough(updatedChar, techniqueCodex, true)
        if (comprehendedId) {
          updatedChar = {
            ...updatedChar,
            learnedTechniques: [...updatedChar.learnedTechniques, comprehendedId],
            techniqueComprehension: seedComprehension(updatedChar.techniqueComprehension ?? {}, comprehendedId),
          }
          const compName = getTechniqueById(comprehendedId)?.name ?? comprehendedId
          events.push({
            type: 'breakthrough_comprehension',
            message: `${updatedChar.name} 豁然开朗，顿悟了 ${compName} 之妙`,
          })
        }
        return {
          updatedChar,
          events,
          resourceCost,
          died: false,
          comprehendedTechniqueId: comprehendedId,
          attemptsCount: 1,
          successesCount: 1,
          unlockedTribulationMilestone: false,
          targetRealmName: nextName,
          breakthroughSuccess: true,
        }
      } else {
        // Non-tribulation major breakthrough failure -> death
        const failedName = getRealmName(char.realm + 1, 0)
        return {
          updatedChar: char,
          events: [{ type: 'breakthrough_failure', message: `${char.name} 突破关口功亏一篑，灵力反噬，身死道消` }],
          resourceCost,
          died: true,
          comprehendedTechniqueId: null,
          attemptsCount: 1,
          successesCount: 0,
          unlockedTribulationMilestone: false,
          targetRealmName: failedName,
          breakthroughSuccess: false,
        }
      }
    }
  } else {
    // Sub-level breakthrough
    if (
      availableSpiritStone - currentCostAccumulator.spiritStone < adjustedSpiritStoneCost ||
      availableSpiritEnergy - currentCostAccumulator.spiritEnergy < cost.spiritEnergy
    ) {
      // Cannot breakthrough: insufficient resources
      return noChange
    }

    const resourceCost = { spiritStone: adjustedSpiritStoneCost, spiritEnergy: cost.spiritEnergy }
    const failureRate = calcBreakthroughFailureRate(char)
    const btResult = performBreakthrough(char, failureRate)
    if (btResult.success) {
      const nextName = getRealmName(btResult.newRealm, btResult.newStage)
      const events: BreakthroughEvent[] = [
        { type: 'breakthrough_success', message: `${char.name} 修为精进，突破至 ${nextName}` },
      ]
      let updatedChar: Character = {
        ...char,
        realm: btResult.newRealm,
        realmStage: btResult.newStage,
        cultivation: 0,
        baseStats: btResult.newStats,
      }
      // Breakthrough comprehension (sub-level)
      const comprehendedId = tryComprehendOnBreakthrough(updatedChar, techniqueCodex, false)
      if (comprehendedId) {
        updatedChar = {
          ...updatedChar,
          learnedTechniques: [...updatedChar.learnedTechniques, comprehendedId],
          techniqueComprehension: seedComprehension(updatedChar.techniqueComprehension ?? {}, comprehendedId),
        }
        const compName = getTechniqueById(comprehendedId)?.name ?? comprehendedId
        events.push({
          type: 'breakthrough_comprehension',
          message: `${updatedChar.name} 豁然开朗，顿悟了 ${compName} 之妙`,
        })
      }
      return {
        updatedChar,
        events,
        resourceCost,
        died: false,
        comprehendedTechniqueId: comprehendedId,
        attemptsCount: 1,
        successesCount: 1,
        unlockedTribulationMilestone: false,
        targetRealmName: nextName,
        breakthroughSuccess: true,
      }
    } else {
      // Sub-level breakthrough failure -> death
      return {
        updatedChar: char,
        events: [{ type: 'breakthrough_failure', message: `${char.name} 修为不足，突破失利，灵力溃散而亡` }],
        resourceCost,
        died: true,
        comprehendedTechniqueId: null,
        attemptsCount: 1,
        successesCount: 0,
        unlockedTribulationMilestone: false,
        targetRealmName: null,
        breakthroughSuccess: false,
      }
    }
  }
}
