import type { StateCreator } from 'zustand'
import type { SectStore } from './types'
import type { Character } from '../../types/character'
import type { BuildingType, OfflineAccumulator } from '../../types'
import { calcSectLevel } from '../../systems/character/CharacterEngine'
import { calcResourceRates, clampResources, calcTaxRate } from '../../systems/economy/ResourceEngine'
import type { ProductionBonuses } from '../../systems/economy/ResourceEngine'
import {
  tick as cultivationTick,
  canBreakthrough,
  breakthrough as performBreakthrough,
  calcBreakthroughFailureRate,
  calcCultivationRate,
} from '../../systems/cultivation/CultivationEngine'
import { tryComprehendOnBreakthrough } from '../../systems/technique/TechniqueSystem'
import { calcResourceCaps } from '../../data/buildings'
import { REALMS, BREAKTHROUGH_COSTS, getMinorBreakthroughCost } from '../../data/realms'
import { tickProductionQueue, calcOfflineProduction } from '../../systems/building/ProductionSystem'
import { getAutoRecipeById } from '../../data/recipes'
import { emitEvent } from '../eventLogStore'
import { getRealmName } from '../../data/realms'
import { shouldTriggerTribulation, resolveTribulation } from '../../systems/cultivation/TribulationSystem'
import { getBuildingBonus } from '../../systems/character/SpecialtySystem'
import { getSynergyBonus } from '../../systems/economy/SynergySystem'
import { addItemQuantityToStacks } from '../../systems/item/ItemStackUtils'
import { produceItemAsStack } from './initial'
import { getTechniqueById } from '../../data/techniquesTable'

export const createTickSlice: StateCreator<SectStore, [], [], SectStore> = (set, get) => ({
  tickAll: (deltaSec: number) => {
    const { sect } = get()

    // 1. Calculate building levels
    const sfLevel = sect.buildings.find((b) => b.type === 'spiritField')?.level ?? 0
    const smLevel = sect.buildings.find((b) => b.type === 'spiritMine')?.level ?? 0
    const mhLevel = sect.buildings.find((b) => b.type === 'mainHall')?.level ?? 0

    // 2. Calculate resource caps
    const caps = calcResourceCaps(sfLevel, smLevel)

    // 3. Calculate technique multiplier from best cultivating character
    const maxTechRate = sect.characters
      .filter((c) => c.status === 'idle' && c.learnedTechniques.length > 0)
      .reduce((max, c) => {
        const rate = calcCultivationRate(c, c.learnedTechniques)
        const baseRate = calcCultivationRate(c, [])
        if (baseRate === 0) return max
        return Math.max(max, rate / baseRate)
      }, 1)
    const bonuses: ProductionBonuses = { techniqueMultiplier: maxTechRate, discipleMultiplier: 1 }

    // 4. Calculate resource rates with production bonuses
    const rates = calcResourceRates({ spiritField: sfLevel, spiritMine: smLevel, mainHall: mhLevel }, bonuses)

    // 4b. Apply specialty bonuses from assigned disciples
    const assignedSpecialties = (buildingType: string) =>
      sect.characters.filter((c) => c.assignedBuilding === buildingType).flatMap((c) => c.specialties)
    rates.spiritStone *= getBuildingBonus('spiritMine', assignedSpecialties('spiritMine'))
    rates.ore *= getBuildingBonus('spiritMine', assignedSpecialties('spiritMine'))
    rates.spiritEnergy *= getBuildingBonus('spiritField', assignedSpecialties('spiritField'))
    rates.herb *= getBuildingBonus('spiritField', assignedSpecialties('spiritField'))

    // 4c. Apply building synergy bonuses
    rates.spiritStone *= getSynergyBonus('spiritMine', sect.buildings)
    rates.ore *= getSynergyBonus('spiritMine', sect.buildings)
    rates.spiritEnergy *= getSynergyBonus('spiritField', sect.buildings)
    rates.herb *= getSynergyBonus('spiritField', sect.buildings)

    const spiritProduced = rates.spiritEnergy * deltaSec

    // Offline accumulator: track items crafted
    const accItemsCrafted: { name: string; quantity: number }[] = []
    const accBreakthroughs: { characterName: string; targetRealm: string; success: boolean }[] = []

    // 5. Process production queues (before cultivation loop)
    const newBuildings = sect.buildings.map((b) => ({ ...b, productionQueue: { ...b.productionQueue } }))
    let newVault = [...sect.vault]
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
            const stack = produceItemAsStack(recipe, building.level)
            if (stack) {
              newVault = addItemQuantityToStacks(newVault, stack.item, stack.quantity)
              accItemsCrafted.push({ name: stack.item.name, quantity: stack.quantity })
            }
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
          if (recipe) {
            const stack = produceItemAsStack(recipe, building.level)
            if (stack) {
              newVault = addItemQuantityToStacks(newVault, stack.item, stack.quantity)
              accItemsCrafted.push({ name: stack.item.name, quantity: stack.quantity })
            }
          }
        }
      }
    }

    // 6. Count cultivating characters (secluded uses spirit stones, not spirit energy)
    const cultivatingCount = sect.characters.filter((c) => c.status === 'idle').length
    const spiritConsumed = cultivatingCount * 2 * deltaSec

    // 7. Spirit ratio
    let spiritRatio = 1
    if (cultivatingCount > 0) {
      spiritRatio = Math.min(1, (sect.resources.spiritEnergy + spiritProduced) / spiritConsumed)
    }

    // 8. Add spirit energy
    let updatedSpiritEnergy = sect.resources.spiritEnergy + spiritProduced

    // 9. Process each character
    let breakthroughStoneCost = 0
    let statBreakthroughAttempts = 0
    let statBreakthroughSuccesses = 0
    const updatedCharacters = sect.characters.map((char) => {
      // Branch 1: idle characters auto-cultivate
      if (char.status === 'idle') {
        const effectiveSpirit = 2 * spiritRatio * deltaSec
        const result = cultivationTick(char, effectiveSpirit, deltaSec, char.learnedTechniques)
        const gained = result.cultivationGained

        let updatedChar: Character = {
          ...char,
          cultivation: char.cultivation + gained,
          totalCultivation: char.totalCultivation + gained,
        }

        // Deduct spirit energy
        updatedSpiritEnergy -= effectiveSpirit

        // Auto-breakthrough check
        if (canBreakthrough(updatedChar)) {
          // Check if this is a major realm breakthrough (max stage -> new realm)
          const currentRealm = REALMS[updatedChar.realm]
          const isMajorBreakthrough = updatedChar.realmStage >= currentRealm.stages.length - 1
          const newRealmIndex = isMajorBreakthrough ? updatedChar.realm + 1 : updatedChar.realm
          const cost = isMajorBreakthrough ? BREAKTHROUGH_COSTS[newRealmIndex] : undefined

          if (cost) {
            // Major realm transition requires spiritStone
            if (sect.resources.spiritStone - breakthroughStoneCost < cost.spiritStone) {
              // Cannot breakthrough: insufficient stones - skip
            } else {
              breakthroughStoneCost += cost.spiritStone

              if (shouldTriggerTribulation(updatedChar.realm, updatedChar.realmStage)) {
                // Tribulation path for realms with tribulationPower
                const tribResult = resolveTribulation(updatedChar)
                if (tribResult.success) {
                  const failureRate = calcBreakthroughFailureRate(updatedChar)
                  statBreakthroughAttempts++
                  const btResult = performBreakthrough(updatedChar, failureRate)
                  if (btResult.success) {
                    statBreakthroughSuccesses++
                    const nextName = getRealmName(btResult.newRealm, btResult.newStage)
                    emitEvent('breakthrough_success', `${updatedChar.name} 渡过天劫，突破至 ${nextName}！`)
                    accBreakthroughs.push({ characterName: updatedChar.name, targetRealm: nextName, success: true })
                    updatedChar = {
                      ...updatedChar,
                      realm: btResult.newRealm,
                      realmStage: btResult.newStage,
                      cultivation: 0,
                      baseStats: btResult.newStats,
                    }
                    const comprehendedId = tryComprehendOnBreakthrough(updatedChar, get().sect.techniqueCodex, true)
                    if (comprehendedId) {
                      updatedChar = {
                        ...updatedChar,
                        learnedTechniques: [...updatedChar.learnedTechniques, comprehendedId],
                      }
                      const compName = getTechniqueById(comprehendedId)?.name ?? comprehendedId
                      emitEvent('breakthrough_comprehension', `${updatedChar.name} 顿悟了 ${compName}`)
                    }
                  } else {
                    emitEvent('breakthrough_failure', `${updatedChar.name} 天劫虽过，但突破失败，修为散尽`)
                    accBreakthroughs.push({
                      characterName: updatedChar.name,
                      targetRealm: getRealmName(btResult.newRealm, btResult.newStage),
                      success: false,
                    })
                    updatedChar = { ...updatedChar, cultivation: 0 }
                  }
                } else {
                  updatedChar = {
                    ...updatedChar,
                    cultivation: 0,
                    status: 'injured' as const,
                    injuryTimer: tribResult.injuryTimer ?? 60,
                  }
                  if (tribResult.severe && updatedChar.realmStage > 0) {
                    updatedChar = {
                      ...updatedChar,
                      realmStage: (updatedChar.realmStage - 1) as Character['realmStage'],
                    }
                    emitEvent(
                      'breakthrough_failure',
                      `${updatedChar.name} 天劫重伤，境界跌落至 ${getRealmName(updatedChar.realm, updatedChar.realmStage)}`
                    )
                  } else if (tribResult.severe) {
                    emitEvent('breakthrough_failure', `${updatedChar.name} 天劫重伤，修为尽失`)
                  } else {
                    emitEvent('breakthrough_failure', `${updatedChar.name} 天劫失败，修为尽失`)
                  }
                }
              } else {
                // Non-tribulation path for realms without tribulationPower
                const failureRate = calcBreakthroughFailureRate(updatedChar)
                statBreakthroughAttempts++
                const btResult = performBreakthrough(updatedChar, failureRate)
                if (btResult.success) {
                  statBreakthroughSuccesses++
                  const nextName = getRealmName(btResult.newRealm, btResult.newStage)
                  emitEvent('breakthrough_success', `${updatedChar.name} 突破至 ${nextName}`)
                  accBreakthroughs.push({ characterName: updatedChar.name, targetRealm: nextName, success: true })
                  updatedChar = {
                    ...updatedChar,
                    realm: btResult.newRealm,
                    realmStage: btResult.newStage,
                    cultivation: 0,
                    baseStats: btResult.newStats,
                  }
                  // Breakthrough comprehension (major)
                  const comprehendedId = tryComprehendOnBreakthrough(
                    updatedChar,
                    get().sect.techniqueCodex,
                    isMajorBreakthrough
                  )
                  if (comprehendedId) {
                    updatedChar = {
                      ...updatedChar,
                      learnedTechniques: [...updatedChar.learnedTechniques, comprehendedId],
                    }
                    const compName = getTechniqueById(comprehendedId)?.name ?? comprehendedId
                    emitEvent('breakthrough_comprehension', `${updatedChar.name} 顿悟了 ${compName}`)
                  }
                } else {
                  emitEvent('breakthrough_failure', `${updatedChar.name} 突破失败，修为散尽`)
                  accBreakthroughs.push({
                    characterName: updatedChar.name,
                    targetRealm: getRealmName(btResult.newRealm, btResult.newStage),
                    success: false,
                  })
                  updatedChar = { ...updatedChar, cultivation: 0 }
                }
              }
            }
          } else {
            // Sub-level breakthrough: check minor breakthrough spirit stone cost
            const minorCost = getMinorBreakthroughCost(updatedChar.realm, updatedChar.realmStage)
            if (sect.resources.spiritStone - breakthroughStoneCost < minorCost) {
              // Cannot breakthrough: insufficient stones - skip (keep cultivation full)
            } else {
              breakthroughStoneCost += minorCost
              const failureRate = calcBreakthroughFailureRate(updatedChar)
              statBreakthroughAttempts++
              const btResult = performBreakthrough(updatedChar, failureRate)
              if (btResult.success) {
                statBreakthroughSuccesses++
                const nextName = getRealmName(btResult.newRealm, btResult.newStage)
                emitEvent('breakthrough_success', `${updatedChar.name} 突破至 ${nextName}`)
                accBreakthroughs.push({ characterName: updatedChar.name, targetRealm: nextName, success: true })
                updatedChar = {
                  ...updatedChar,
                  realm: btResult.newRealm,
                  realmStage: btResult.newStage,
                  cultivation: 0,
                  baseStats: btResult.newStats,
                }
                // Breakthrough comprehension (sub-level)
                const subComprehendedId = tryComprehendOnBreakthrough(updatedChar, get().sect.techniqueCodex, false)
                if (subComprehendedId) {
                  updatedChar = {
                    ...updatedChar,
                    learnedTechniques: [...updatedChar.learnedTechniques, subComprehendedId],
                  }
                  const subCompName = getTechniqueById(subComprehendedId)?.name ?? subComprehendedId
                  emitEvent('breakthrough_comprehension', `${updatedChar.name} 顿悟了 ${subCompName}`)
                }
              } else {
                emitEvent('breakthrough_failure', `${updatedChar.name} 突破失败，修为散尽`)
                accBreakthroughs.push({
                  characterName: updatedChar.name,
                  targetRealm: getRealmName(btResult.newRealm, btResult.newStage),
                  success: false,
                })
                updatedChar = { ...updatedChar, cultivation: 0 }
              }
            }
          }
        }

        return updatedChar
      }

      // Branch 2: non-idle characters (training/adventuring/patrolling/injured/resting)
      if (char.status === 'injured' || char.status === 'resting') {
        // Reduce injuryTimer (reused as recovery timer for resting)
        const newTimer = Math.max(0, char.injuryTimer - deltaSec)
        if (newTimer <= 0) {
          return { ...char, status: 'idle' as const, injuryTimer: 0 }
        }
        return { ...char, injuryTimer: newTimer }
      }

      // training, adventuring, patrolling — return unchanged
      return char
    })

    // 11. Recalculate sect level from mainHall building level
    const mainHallLevel =
      updatedCharacters.length > 0 ? (get().sect.buildings.find((b) => b.type === 'mainHall')?.level ?? 1) : 1
    const newSectLevel = calcSectLevel(mainHallLevel)

    // 12. Build new sect with updated resources (production + cultivation - consumed + tax)
    const taxProduced = calcTaxRate(newSectLevel, sect.characters.length) * deltaSec

    const newResources = {
      spiritEnergy: Math.max(0, updatedSpiritEnergy),
      spiritStone: Math.max(
        0,
        sect.resources.spiritStone +
          rates.spiritStone * deltaSec +
          taxProduced -
          totalConsumed.spiritStone -
          breakthroughStoneCost
      ),
      herb: sect.resources.herb + rates.herb * deltaSec - totalConsumed.herb,
      ore: sect.resources.ore + rates.ore * deltaSec - totalConsumed.ore,
    }

    // 13. Clamp resources to caps
    const clampedResources = clampResources(newResources, caps)

    // 14. Update offline accumulator
    const prevAcc = sect.offlineAccumulator
    const updatedAccumulator: OfflineAccumulator = {
      resourcesGained: {
        spiritStone: prevAcc.resourcesGained.spiritStone + rates.spiritStone * deltaSec + taxProduced,
        spiritEnergy: prevAcc.resourcesGained.spiritEnergy + spiritProduced,
        herb: prevAcc.resourcesGained.herb + rates.herb * deltaSec,
        ore: prevAcc.resourcesGained.ore + rates.ore * deltaSec,
      },
      breakthroughs: [...prevAcc.breakthroughs, ...accBreakthroughs],
      itemsCrafted: [...prevAcc.itemsCrafted, ...accItemsCrafted],
      taxIncome: prevAcc.taxIncome + taxProduced,
    }

    // Calculate spirit stone income for stats
    const spiritStoneEarned = rates.spiritStone * deltaSec + taxProduced

    // Build the updated sect for the set call
    const newSect = {
      ...sect,
      characters: updatedCharacters,
      resources: clampedResources,
      buildings: newBuildings,
      vault: newVault,
      level: newSectLevel,
      offlineAccumulator: updatedAccumulator,
      stats: {
        ...sect.stats,
        totalSpiritStoneEarned: sect.stats.totalSpiritStoneEarned + spiritStoneEarned,
        totalSpiritStoneSpent: sect.stats.totalSpiritStoneSpent + breakthroughStoneCost,
        totalBreakthroughAttempts: sect.stats.totalBreakthroughAttempts + statBreakthroughAttempts,
        totalBreakthroughSuccesses: sect.stats.totalBreakthroughSuccesses + statBreakthroughSuccesses,
        totalPlayTime: sect.stats.totalPlayTime + deltaSec,
      },
    }

    set({
      sect: newSect,
    })

    return {
      spiritProduced,
      spiritConsumed: cultivatingCount > 0 ? Math.min(spiritConsumed, spiritProduced + sect.resources.spiritEnergy) : 0,
    }
  },
})
