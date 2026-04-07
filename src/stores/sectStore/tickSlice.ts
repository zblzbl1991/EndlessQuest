import type { StateCreator } from 'zustand'
import type { SectStore } from './types'
import type { Character } from '../../types/character'
import type { BuildingType, OfflineAccumulator } from '../../types'
import { useGameStore } from '../gameStore'
import { useAdventureStore } from '../adventureStore'
import { calcSectLevel } from '../../systems/character/CharacterEngine'
import {
  calcResourceRates,
  clampResources,
  calcTaxRate,
  applySpiritStoneDecay,
} from '../../systems/economy/ResourceEngine'
import type { ProductionBonuses } from '../../systems/economy/ResourceEngine'
import {
  tick as cultivationTick,
  canBreakthrough,
  calcCultivationRate,
} from '../../systems/cultivation/CultivationEngine'
import { processBreakthrough } from '../../systems/cultivation/BreakthroughCoordinator'
import { needsCultivationPathChoice } from '../../systems/character/CultivationPathSystem'
import { rollCultivationPath, getPathName } from '../../data/cultivationPaths'
import { calcResourceCaps } from '../../data/buildings'
import { tickProductionQueue, calcOfflineProduction } from '../../systems/building/ProductionSystem'
import { getAutoRecipeById } from '../../data/recipes'
import { emitEvent } from '../eventLogStore'
import { getBuildingBonus } from '../../systems/character/SpecialtySystem'
import { getSynergyBonus } from '../../systems/economy/SynergySystem'
import { addItemQuantityToStacks } from '../../systems/item/ItemStackUtils'
import { produceItemAsStack } from './initial'
import { syncCharacterSkillLoadout } from '../../data/activeSkills'
import { getArchiveMilestoneDef, unlockArchiveMilestone } from '../../data/archiveMilestones'
import { tickRecoveryDays } from '../../systems/character/DiscipleRecoverySystem'
import { buildAutomationRunConfig, shouldAutoRecruit } from '../../systems/sect/SectAutomationSystem'
import { calcBuildingRouteBonus } from '../../systems/sect/SectRouteSystem'

export const createTickSlice: StateCreator<SectStore, [], [], Partial<SectStore>> = (set, get) => ({
  tickAll: (deltaSec: number) => {
    const { sect } = get()
    const gameState = useGameStore.getState()
    const totalDayProgress = gameState.dayProgressSec + deltaSec
    const elapsedDays = Math.floor(totalDayProgress / 60)

    // 1. Calculate building levels
    const sfLevel = sect.buildings.find((b) => b.type === 'spiritField')?.level ?? 0
    const sfCount = sect.buildings.find((b) => b.type === 'spiritField')?.count ?? 0
    const smLevel = sect.buildings.find((b) => b.type === 'spiritMine')?.level ?? 0
    const smCount = sect.buildings.find((b) => b.type === 'spiritMine')?.count ?? 0
    const mhLevel = sect.buildings.find((b) => b.type === 'mainHall')?.level ?? 0

    // 2. Calculate resource caps
    const caps = calcResourceCaps(sfLevel, smLevel, sfCount, smCount)

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
    const rates = calcResourceRates(
      {
        spiritField: sfLevel,
        spiritFieldCount: sfCount,
        spiritMine: smLevel,
        spiritMineCount: smCount,
        mainHall: mhLevel,
      },
      bonuses
    )

    // 4b. Apply specialty bonuses from assigned disciples
    const assignedSpecialties = (buildingType: string) =>
      sect.characters
        .filter((c) => c.status === 'training' && c.assignedBuilding === buildingType)
        .flatMap((c) => c.specialties)
    rates.spiritStone *= getBuildingBonus('spiritMine', assignedSpecialties('spiritMine'))
    rates.ore *= getBuildingBonus('spiritMine', assignedSpecialties('spiritMine'))
    rates.spiritEnergy *= getBuildingBonus('spiritField', assignedSpecialties('spiritField'))
    rates.herb *= getBuildingBonus('spiritField', assignedSpecialties('spiritField'))

    // 4c. Apply building synergy bonuses
    rates.spiritStone *= getSynergyBonus('spiritMine', sect.buildings)
    rates.ore *= getSynergyBonus('spiritMine', sect.buildings)
    rates.spiritEnergy *= getSynergyBonus('spiritField', sect.buildings)
    rates.herb *= getSynergyBonus('spiritField', sect.buildings)
    rates.spiritStone *= calcBuildingRouteBonus(sect.activeRoute, 'spiritMine')
    rates.ore *= calcBuildingRouteBonus(sect.activeRoute, 'spiritMine')
    rates.spiritEnergy *= calcBuildingRouteBonus(sect.activeRoute, 'spiritField')
    rates.herb *= calcBuildingRouteBonus(sect.activeRoute, 'spiritField')

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
      const routeSpeedBonus = calcBuildingRouteBonus(sect.activeRoute, bType)
      const vaultFreeSlots = sect.maxVaultSlots - newVault.length
      if (deltaSec >= USE_OFFLINE_THRESHOLD) {
        const offlineResult = calcOfflineProduction(
          building.productionQueue,
          sect.resources,
          deltaSec * routeSpeedBonus,
          vaultFreeSlots
        )
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
        const result = tickProductionQueue(
          building.productionQueue,
          sect.resources,
          deltaSec * routeSpeedBonus,
          vaultFull
        )
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
    let breakthroughEnergyCost = 0
    let statBreakthroughAttempts = 0
    let statBreakthroughSuccesses = 0
    let unlockedFirstTribulationSuccess = false
    const pathAssignedEvents: string[] = []
    const breakthroughDeaths: Character[] = []
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

        // Auto-assign cultivation path if needed (roguelike randomness)
        if (needsCultivationPathChoice(updatedChar)) {
          const path = rollCultivationPath(updatedChar.quality)
          updatedChar = syncCharacterSkillLoadout({ ...updatedChar, cultivationPath: path })
          if (path !== 'none') {
            pathAssignedEvents.push(`${updatedChar.name} 随缘定下修行方向：${getPathName(path)}`)
          }
        }

        // Auto-breakthrough: delegate to pure coordinator
        if (canBreakthrough(updatedChar)) {
          const btResult = processBreakthrough(
            updatedChar,
            sect.resources.spiritStone - breakthroughStoneCost,
            updatedSpiritEnergy - breakthroughEnergyCost,
            get().sect.techniqueCodex,
            { spiritStone: breakthroughStoneCost, spiritEnergy: breakthroughEnergyCost }
          )

          updatedChar = btResult.updatedChar
          breakthroughStoneCost += btResult.resourceCost.spiritStone
          breakthroughEnergyCost += btResult.resourceCost.spiritEnergy
          statBreakthroughAttempts += btResult.attemptsCount
          statBreakthroughSuccesses += btResult.successesCount

          for (const event of btResult.events) {
            emitEvent(event.type, event.message)
          }

          if (btResult.died) {
            breakthroughDeaths.push(updatedChar)
          }

          if (btResult.unlockedTribulationMilestone) {
            unlockedFirstTribulationSuccess = true
          }

          // Track breakthroughs for offline accumulator from events
          for (const event of btResult.events) {
            if (event.type === 'breakthrough_success') {
              const targetRealm = `${updatedChar.realm}-${updatedChar.realmStage}`
              accBreakthroughs.push({ characterName: updatedChar.name, targetRealm, success: true })
            } else if (event.type === 'breakthrough_failure') {
              accBreakthroughs.push({ characterName: updatedChar.name, targetRealm: 'unknown', success: false })
            }
          }
        }

        return syncCharacterSkillLoadout(updatedChar)
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

      if (char.status === 'recovering') {
        return char
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

    // Apply spirit stone soft cap decay to mine production (tax is NOT affected)
    const mineStoneProduced = applySpiritStoneDecay(rates.spiritStone * deltaSec, sect.resources.spiritStone, mhLevel)

    const newResources = {
      spiritEnergy: Math.max(0, updatedSpiritEnergy - breakthroughEnergyCost),
      spiritStone: Math.max(
        0,
        sect.resources.spiritStone + mineStoneProduced + taxProduced - totalConsumed.spiritStone - breakthroughStoneCost
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
        spiritStone: prevAcc.resourcesGained.spiritStone + mineStoneProduced + taxProduced,
        spiritEnergy: prevAcc.resourcesGained.spiritEnergy + spiritProduced,
        herb: prevAcc.resourcesGained.herb + rates.herb * deltaSec,
        ore: prevAcc.resourcesGained.ore + rates.ore * deltaSec,
      },
      breakthroughs: [...prevAcc.breakthroughs, ...accBreakthroughs],
      itemsCrafted: [...prevAcc.itemsCrafted, ...accItemsCrafted],
      taxIncome: prevAcc.taxIncome + taxProduced,
    }

    // Calculate spirit stone income for stats
    const spiritStoneEarned = mineStoneProduced + taxProduced

    // Build the updated sect for the set call
    let archiveMilestones = sect.archiveMilestones
    if (unlockedFirstTribulationSuccess) {
      const nextMilestones = unlockArchiveMilestone(archiveMilestones, 'firstTribulationSuccess')
      if (nextMilestones.length !== archiveMilestones.length) {
        archiveMilestones = nextMilestones
        emitEvent('milestone', `宗门里程碑达成：${getArchiveMilestoneDef('firstTribulationSuccess').title}`)
      }
    }

    const newSect = {
      ...sect,
      characters: updatedCharacters,
      resources: clampedResources,
      buildings: newBuildings,
      vault: newVault,
      level: newSectLevel,
      offlineAccumulator: updatedAccumulator,
      archiveMilestones,
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

    useGameStore.setState({
      currentGameDay: gameState.currentGameDay + elapsedDays,
      dayProgressSec: totalDayProgress % 60,
    })

    if (elapsedDays > 0) {
      for (let day = 0; day < elapsedDays; day++) {
        set((state) => ({
          sect: {
            ...state.sect,
            characters: state.sect.characters.map((character) => {
              if (character.status !== 'recovering') return character

              const result = tickRecoveryDays(character.recoveryDaysRemaining ?? 0, 1)
              return result.recovered
                ? {
                    ...character,
                    status: 'idle',
                    recoveryDaysRemaining: 0,
                    injuryTimer: 0,
                  }
                : {
                    ...character,
                    recoveryDaysRemaining: result.remainingDays,
                  }
            }),
          },
        }))

        let currentState = get()
        while (
          shouldAutoRecruit({
            spiritStone: currentState.sect.resources.spiritStone,
            reserveSpiritStone: currentState.sect.automationSettings.reserveSpiritStone,
            spiritEnergy: currentState.sect.resources.spiritEnergy,
            reserveSpiritEnergy: currentState.sect.automationSettings.reserveSpiritEnergy,
          })
        ) {
          const recruited = currentState.addCharacter()
          if (!recruited) break
          currentState = get()
        }

        currentState = get()
        const maxRealmCharacter = currentState.sect.characters.reduce<Character | null>((best, character) => {
          if (!best) return character
          if (character.realm > best.realm) return character
          if (character.realm === best.realm && character.realmStage > best.realmStage) return character
          return best
        }, null)
        const autoRunConfig = buildAutomationRunConfig({
          settings: currentState.sect.automationSettings,
          characters: currentState.sect.characters,
          dungeons: useAdventureStore.getState().dungeons,
          spiritStone: currentState.sect.resources.spiritStone,
          spiritEnergy: currentState.sect.resources.spiritEnergy,
          playerRealm: maxRealmCharacter?.realm ?? 0,
          playerStage: maxRealmCharacter?.realmStage ?? 0,
        })

        if (autoRunConfig) {
          useAdventureStore.getState().runAutomation(autoRunConfig)
        }
      }
    }

    for (const character of breakthroughDeaths) {
      get().sacrificeCharacter(character.id, { source: 'breakthrough', reason: '突破失败，身死道消' })
    }

    for (const msg of pathAssignedEvents) {
      emitEvent('milestone', msg)
    }

    return {
      spiritProduced,
      spiritConsumed: cultivatingCount > 0 ? Math.min(spiritConsumed, spiritProduced + sect.resources.spiritEnergy) : 0,
    }
  },
})
