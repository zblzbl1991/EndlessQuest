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
  calcSpiritStoneCap,
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
import { buildPathEffectMap, getMultEffect } from '../../systems/sect/SectPathEffects'
import { evaluateRandomEvents } from '../../systems/idle/RandomEventSystem'
import { getLegacyRecoveryBonusDays } from '../../data/legacy'
import { applyCharacterExperience } from '../../data/levelSystem'
import { getArchetypeModifiers } from '../../systems/sect/SectArchetypeSystem'
import { getCampaignModifiers, tickCampaignDuration } from '../../systems/sect/ProductionCampaignSystem'

function getMarketLossRate(marketLevel: number): number {
  return Math.max(0.3, 0.667 - 0.05 * marketLevel)
}

function sellOverflowResource(amount: number, marketLevel: number): number {
  if (amount <= 0) return 0
  return Math.floor((amount / 3) * (1 - getMarketLossRate(marketLevel)))
}

function formatLevelUpMessage(
  name: string,
  source: 'cultivation' | 'event',
  level: number,
  statBoost: { hp: number; atk: number; def: number }
): string {
  const sourceText = source === 'cultivation' ? '闭关有成' : '机缘顿悟'
  return `${name}${sourceText}，升至 Lv.${level}（气血 +${statBoost.hp} / 攻击 +${statBoost.atk} / 防御 +${statBoost.def}）`
}

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

    // 4d. Apply sect path effects
    const pathEffectMap = buildPathEffectMap(sect.sectPath, sect.unlockedPathNodeIds)
    rates.herb *= getMultEffect(pathEffectMap, 'herbYield')

    // 4e. Apply archetype and campaign modifiers
    const archMods = getArchetypeModifiers(sect.currentArchetype)
    const campMods = getCampaignModifiers(sect.automationSettings.productionCampaign?.activeCampaign ?? null)
    rates.spiritStone *= archMods.resourceTemplateMultiplier * campMods.marketEfficiency
    rates.spiritEnergy *= archMods.resourceTemplateMultiplier * campMods.cultivationEfficiency
    rates.herb *= archMods.resourceTemplateMultiplier * campMods.cultivationEfficiency
    rates.ore *= archMods.resourceTemplateMultiplier * campMods.forgeEfficiency

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
    const realmsReachedByBreakthrough: Set<number> = new Set()
    const pathAssignedEvents: string[] = []
    const levelUpEvents: string[] = []
    const breakthroughDeaths: Character[] = []
    const updatedCharacters = sect.characters.map((char) => {
      // Branch 1: idle characters auto-cultivate
      if (char.status === 'idle') {
        const effectiveSpirit = 2 * spiritRatio * deltaSec
        const result = cultivationTick(char, effectiveSpirit, deltaSec, char.learnedTechniques)
        // Apply archetype cultivation multiplier and campaign cultivation efficiency
        const gained = result.cultivationGained * archMods.cultivationMultiplier * campMods.cultivationEfficiency

        let updatedChar: Character = {
          ...char,
          cultivation: char.cultivation + gained,
          totalCultivation: char.totalCultivation + gained,
        }

        const xpGain = Math.max(0, Math.floor(gained / 5))
        if (xpGain > 0) {
          const levelResult = applyCharacterExperience(updatedChar, xpGain)
          updatedChar = levelResult.character
          if (levelResult.levelsGained > 0) {
            levelUpEvents.push(
              formatLevelUpMessage(updatedChar.name, 'cultivation', updatedChar.level, levelResult.statBoost)
            )
          }
        }

        // Apply comprehension growth from cultivation tick
        if (Object.keys(result.comprehensionGrowth).length > 0) {
          const newComprehension = { ...char.techniqueComprehension }
          for (const [techId, growth] of Object.entries(result.comprehensionGrowth)) {
            newComprehension[techId] = Math.min(100, (newComprehension[techId] ?? 0) + growth)
          }
          updatedChar = { ...updatedChar, techniqueComprehension: newComprehension }
        }

        // Deduct spirit energy
        updatedSpiritEnergy -= effectiveSpirit

        // Auto-assign cultivation path if needed (roguelike randomness)
        if (needsCultivationPathChoice(updatedChar)) {
          const path = rollCultivationPath(updatedChar.quality)
          updatedChar = syncCharacterSkillLoadout({ ...updatedChar, cultivationPath: path })
          if (path !== 'none') {
            pathAssignedEvents.push(`${updatedChar.name} 机缘所至，定下修行方向：${getPathName(path)}`)
          }
        }

        // Auto-breakthrough: delegate to pure coordinator
        if (canBreakthrough(updatedChar)) {
          const btResult = processBreakthrough(
            updatedChar,
            sect.resources.spiritStone - breakthroughStoneCost,
            updatedSpiritEnergy - breakthroughEnergyCost,
            get().sect.techniqueCodex,
            { spiritStone: breakthroughStoneCost, spiritEnergy: breakthroughEnergyCost },
            pathEffectMap
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

          if (btResult.breakthroughSuccess) {
            realmsReachedByBreakthrough.add(btResult.updatedChar.realm)
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
        // Apply archetype recovery multiplier and campaign recovery efficiency
        const recoveryDelta = deltaSec * archMods.recoveryMultiplier * campMods.recoveryEfficiency
        const newTimer = Math.max(0, char.injuryTimer - recoveryDelta)
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
    // Apply spirit stone soft cap decay to mine production and tax
    const mineStoneProduced = applySpiritStoneDecay(rates.spiritStone * deltaSec, sect.resources.spiritStone, mhLevel)
    const taxProduced = applySpiritStoneDecay(
      calcTaxRate(newSectLevel, sect.characters.length) * deltaSec,
      sect.resources.spiritStone,
      mhLevel
    )

    const newResources = {
      spiritEnergy: Math.max(0, updatedSpiritEnergy - breakthroughEnergyCost),
      spiritStone: Math.max(
        0,
        sect.resources.spiritStone + mineStoneProduced + taxProduced - totalConsumed.spiritStone - breakthroughStoneCost
      ),
      herb: sect.resources.herb + rates.herb * deltaSec - totalConsumed.herb,
      ore: sect.resources.ore + rates.ore * deltaSec - totalConsumed.ore,
    }

    const overflowTriggerRatio = Math.min(0.98, Math.max(0.5, sect.automationSettings.overflowTriggerRatio ?? 0.9))
    const stoneCap = calcSpiritStoneCap(mhLevel) * 5
    const marketLevel = sect.buildings.find((building) => building.type === 'market')?.level ?? 0
    const overflowAdjustedResources = { ...newResources }
    let overflowStoneEarned = 0

    const herbTrigger = caps.herb * overflowTriggerRatio
    if (sect.automationSettings.herbOverflowRule === 'sell' && overflowAdjustedResources.herb > herbTrigger) {
      const sellAmount = Math.floor(overflowAdjustedResources.herb - herbTrigger)
      const gainedStone = sellOverflowResource(sellAmount, marketLevel)
      overflowAdjustedResources.herb -= sellAmount
      overflowAdjustedResources.spiritStone += gainedStone
      overflowStoneEarned += gainedStone
    }

    const oreTrigger = caps.ore * overflowTriggerRatio
    if (sect.automationSettings.oreOverflowRule === 'sell' && overflowAdjustedResources.ore > oreTrigger) {
      const sellAmount = Math.floor(overflowAdjustedResources.ore - oreTrigger)
      const gainedStone = sellOverflowResource(sellAmount, marketLevel)
      overflowAdjustedResources.ore -= sellAmount
      overflowAdjustedResources.spiritStone += gainedStone
      overflowStoneEarned += gainedStone
    }

    const stoneTrigger = stoneCap * overflowTriggerRatio
    const targetResource =
      sect.automationSettings.spiritStoneOverflowRule === 'buyHerb'
        ? 'herb'
        : sect.automationSettings.spiritStoneOverflowRule === 'buyOre'
          ? 'ore'
          : null

    if (targetResource && overflowAdjustedResources.spiritStone > stoneTrigger) {
      const targetTrigger = targetResource === 'herb' ? herbTrigger : oreTrigger
      const targetRoom = Math.max(0, Math.floor(targetTrigger - overflowAdjustedResources[targetResource]))
      const stoneExcess = Math.floor(overflowAdjustedResources.spiritStone - stoneTrigger)
      const spendableStone = Math.min(stoneExcess, Math.floor(targetRoom / 2))

      if (spendableStone > 0) {
        overflowAdjustedResources.spiritStone -= spendableStone
        overflowAdjustedResources[targetResource] += spendableStone * 2
      }
    }

    // 13. Clamp resources to caps (with spirit stone hard cap = soft cap * 5)
    const clampedResources = clampResources(overflowAdjustedResources, caps, stoneCap)

    // Dynamic vault capacity: 50 + (mainHallLevel - 1) * 20
    const dynamicMaxVaultSlots = 50 + (mhLevel - 1) * 20

    // 14. Update offline accumulator
    const prevAcc = sect.offlineAccumulator
    const updatedAccumulator: OfflineAccumulator = {
      resourcesGained: {
        spiritStone: prevAcc.resourcesGained.spiritStone + mineStoneProduced + taxProduced + overflowStoneEarned,
        spiritEnergy: prevAcc.resourcesGained.spiritEnergy + spiritProduced,
        herb: prevAcc.resourcesGained.herb + rates.herb * deltaSec,
        ore: prevAcc.resourcesGained.ore + rates.ore * deltaSec,
      },
      breakthroughs: [...prevAcc.breakthroughs, ...accBreakthroughs],
      itemsCrafted: [...prevAcc.itemsCrafted, ...accItemsCrafted],
      taxIncome: prevAcc.taxIncome + taxProduced,
    }

    // Calculate spirit stone income for stats
    const spiritStoneEarned = mineStoneProduced + taxProduced + overflowStoneEarned

    // Build the updated sect for the set call
    let archiveMilestones = sect.archiveMilestones
    if (unlockedFirstTribulationSuccess) {
      const nextMilestones = unlockArchiveMilestone(archiveMilestones, 'firstTribulationSuccess')
      if (nextMilestones.length !== archiveMilestones.length) {
        archiveMilestones = nextMilestones
        emitEvent('milestone', `宗门里程碑达成：${getArchiveMilestoneDef('firstTribulationSuccess').title}`)
      }
    }

    // Realm breakthrough milestones
    // REALMS index: 0=炼气, 1=筑基, 2=金丹, 3=元婴
    const realmMilestones: {
      realm: number
      milestoneId: 'firstFoundationBreakthrough' | 'firstGoldenCoreBreakthrough' | 'firstNascentSoulBreakthrough'
    }[] = [
      { realm: 1, milestoneId: 'firstFoundationBreakthrough' },
      { realm: 2, milestoneId: 'firstGoldenCoreBreakthrough' },
      { realm: 3, milestoneId: 'firstNascentSoulBreakthrough' },
    ]
    for (const { realm, milestoneId } of realmMilestones) {
      if (realmsReachedByBreakthrough.has(realm)) {
        const nextMilestones = unlockArchiveMilestone(archiveMilestones, milestoneId)
        if (nextMilestones.length !== archiveMilestones.length) {
          archiveMilestones = nextMilestones
          emitEvent('milestone', `宗门里程碑达成：${getArchiveMilestoneDef(milestoneId).title}`)
        }
      }
    }

    // Sect level milestone
    if (newSectLevel >= 5) {
      const nextMilestones = unlockArchiveMilestone(archiveMilestones, 'sectLevel5')
      if (nextMilestones.length !== archiveMilestones.length) {
        archiveMilestones = nextMilestones
        emitEvent('milestone', `宗门里程碑达成：${getArchiveMilestoneDef('sectLevel5').title}`)
      }
    }

    const newSect = {
      ...sect,
      characters: updatedCharacters,
      resources: clampedResources,
      buildings: newBuildings,
      vault: newVault,
      maxVaultSlots: dynamicMaxVaultSlots,
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

    // --- Random Events ---
    // Evaluate random events using the pure system function
    const randomEventResult = evaluateRandomEvents(sect, deltaSec, sect.lastRandomEventTime ?? 0)
    let sectWithEvent = newSect
    const randomEventLevelUps: string[] = []

    if (randomEventResult.triggered && randomEventResult.event) {
      // Apply resource effects
      const eventResources = { ...newSect.resources }
      for (const effect of randomEventResult.effects) {
        if (effect.type === 'resource' && effect.target) {
          const key = effect.target as keyof typeof eventResources
          if (key in eventResources) {
            eventResources[key] = Math.max(0, eventResources[key] + effect.value)
          }
        }
      }

      // Apply character experience effects to a random idle character
      let eventCharacters = newSect.characters
      for (const effect of randomEventResult.effects) {
        if (effect.type === 'character_exp' && effect.value > 0) {
          const idleIndices = eventCharacters.map((c, i) => (c.status === 'idle' ? i : -1)).filter((i) => i >= 0)
          if (idleIndices.length > 0) {
            const pickIdx = idleIndices[Math.floor(Math.random() * idleIndices.length)]
            eventCharacters = eventCharacters.map((c, i) => {
              if (i !== pickIdx) return c
              const levelResult = applyCharacterExperience(c, effect.value)
              if (levelResult.levelsGained > 0) {
                randomEventLevelUps.push(
                  formatLevelUpMessage(
                    levelResult.character.name,
                    'event',
                    levelResult.character.level,
                    levelResult.statBoost
                  )
                )
              }
              return levelResult.character
            })
          }
        }
      }

      // Apply technique insight effects to a random idle character with techniques
      for (const effect of randomEventResult.effects) {
        if (effect.type === 'technique_insight' && effect.value > 0) {
          const candidates = eventCharacters.filter((c) => c.status === 'idle' && c.learnedTechniques.length > 0)
          if (candidates.length > 0) {
            const target = candidates[Math.floor(Math.random() * candidates.length)]
            eventCharacters = eventCharacters.map((c) => {
              if (c.id !== target.id) return c
              const newComprehension = { ...c.techniqueComprehension }
              // Pick a random learned technique to boost
              const techId = c.learnedTechniques[Math.floor(Math.random() * c.learnedTechniques.length)]
              newComprehension[techId] = Math.min(100, (newComprehension[techId] ?? 0) + effect.value)
              return { ...c, techniqueComprehension: newComprehension }
            })
          }
        }
      }

      // Apply character status effects (injury)
      for (const effect of randomEventResult.effects) {
        if (effect.type === 'character_status' && effect.target === 'injured' && effect.value > 0) {
          // Injure up to effect.value idle characters
          let injured = 0
          eventCharacters = eventCharacters.map((c) => {
            if (c.status === 'idle' && injured < effect.value) {
              injured++
              return { ...c, status: 'injured' as const, injuryTimer: 300 } // 5 minute injury
            }
            return c
          })
        }
      }

      sectWithEvent = {
        ...newSect,
        resources: eventResources,
        characters: eventCharacters,
        lastRandomEventTime: newSect.stats.totalPlayTime,
      }

      emitEvent('random_event', randomEventResult.message, {
        eventId: randomEventResult.event.id,
        rarity: randomEventResult.event.rarity,
        category: randomEventResult.event.category,
      })
    }

    set({
      sect: sectWithEvent,
    })

    useGameStore.setState({
      currentGameDay: gameState.currentGameDay + elapsedDays,
      dayProgressSec: totalDayProgress % 60,
    })

    if (elapsedDays > 0) {
      for (let day = 0; day < elapsedDays; day++) {
        // Recovery and counter run every day (not gated by auto-run interval)
        set((state) => ({
          sect: {
            ...state.sect,
            autoRunDayCounter: (state.sect.autoRunDayCounter ?? 0) + 1,
            // --- Route shift blend period countdown ---
            automationSettings: {
              ...state.sect.automationSettings,
              routeShift: {
                ...state.sect.automationSettings.routeShift,
                blendDaysRemaining: Math.max(
                  0,
                  (state.sect.automationSettings.routeShift?.blendDaysRemaining ?? 0) - 1
                ),
              },
              // --- Production campaign duration tick ---
              productionCampaign: tickCampaignDuration(
                state.sect.automationSettings.productionCampaign,
                (state.sect.autoRunDayCounter ?? 0) + 1
              ),
            },
            characters: state.sect.characters.map((character) => {
              if (character.status !== 'recovering') return character

              const result = tickRecoveryDays(
                character.recoveryDaysRemaining ?? 0,
                1 + getLegacyRecoveryBonusDays(state.sect.legacy.ascensionCount)
              )
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

        // Auto-recruit runs every day
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

        // Auto-run only every 5 game days
        currentState = get()
        if ((currentState.sect.autoRunDayCounter ?? 0) >= 5) {
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
            ascensionCount: currentState.sect.legacy.ascensionCount,
            unlockedLegacyDungeonIds: currentState.sect.legacy.unlockedDungeons,
            archiveMilestones: currentState.sect.archiveMilestones,
          })

          if (autoRunConfig) {
            useAdventureStore.getState().runAutomation(autoRunConfig)
          }

          // Reset counter
          set((state) => ({ sect: { ...state.sect, autoRunDayCounter: 0 } }))
        }
      }
    }

    for (const character of breakthroughDeaths) {
      get().sacrificeCharacter(character.id, { source: 'breakthrough', reason: '突破失败，身死道消' })
    }

    for (const msg of pathAssignedEvents) {
      emitEvent('milestone', msg)
    }

    for (const msg of [...levelUpEvents, ...randomEventLevelUps]) {
      emitEvent('milestone', msg)
    }

    return {
      spiritProduced,
      spiritConsumed: cultivatingCount > 0 ? Math.min(spiritConsumed, spiritProduced + sect.resources.spiritEnergy) : 0,
    }
  },
})
