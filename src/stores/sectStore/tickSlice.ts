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
  getSectStoneCap,
} from '../../systems/economy/ResourceEngine'
import type { ProductionBonuses } from '../../systems/economy/ResourceEngine'
import {
  tick as cultivationTick,
  canBreakthrough,
  calcCultivationRate,
  calcSpiritCostPerSecond,
} from '../../systems/cultivation/CultivationEngine'
import { processBreakthrough } from '../../systems/cultivation/BreakthroughCoordinator'
import { canStartRecipe } from '../../systems/building/ProductionSystem'
import { aggregateEquipmentAffixes } from '../../data/equipmentAffixes'
import { aggregateCaveHeavenEffects } from '../../data/caveHeavens'
import { findEquipmentById as findEqForAffix } from './initial'
import { processCultivationEvent } from '../../systems/cultivation/CultivationEventSystem'
import { needsCultivationPathChoice } from '../../systems/character/CultivationPathSystem'
import { rollCultivationPath, getPathName } from '../../data/cultivationPaths'
import {
  calcResourceCaps,
  getSectMilestoneAlchemyThroughput,
  getSectMilestoneRateMult,
  getImmortalVeinStoneRate,
  getImmortalFieldEnergyRate,
  getImmortalFieldHerbRate,
  getImmortalPalaceCultivationMult,
} from '../../data/buildings'
import { getRealmEconomyMult } from '../../data/realms'
import {
  getLegacyCultivationMult,
  getLegacyStoneMult,
  getLegacyEnergyMult,
  getLegacyBreakthroughBonus,
  getLegacyDaoEssenceMult,
  isAutoAscendUnlocked,
  calcDaoYunGain,
} from '../../data/legacy'
import { canAscend as checkCanAscend } from '../../systems/sect/LegacySystem'
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
import { getAutomationsUnlockedAtRealm } from '../../data/automationUnlocks'
import { getBuildingCultivationMult } from '../../systems/cultivation/ProgressForecast'
import {
  getGenesisCultivationMult,
  getGenesisResourceMult,
  getGenesisMortalSpeedMult,
  getGenesisImmortalSpeedMult,
  getGenesisBreakthroughBonus,
} from '../../data/genesisTree'
import { shouldAutoProveDao } from '../../systems/sect/GenesisSystem'
import { attemptRecord } from '../../systems/sect/DaozuRecords'
import { isCapabilityUnlocked } from '../../data/buildings'
import { evaluateRandomEventsForDelta } from '../../systems/idle/RandomEventSystem'
import { getLegacyRecoveryBonusDays } from '../../data/legacy'
import { applyCharacterExperience } from '../../data/levelSystem'
import { getArchetypeModifiers } from '../../systems/sect/SectArchetypeSystem'
import { getCampaignModifiers, tickCampaignDuration } from '../../systems/sect/ProductionCampaignSystem'
import { expireRouteOpportunities } from '../../systems/sect/RouteOpportunitySystem'
import { getTideState } from '../../systems/economy/TideSystem'

// Cooldown tracker for breakthrough_blocked events (characterId -> last emit tick)
const breakthroughBlockedCooldown = new Map<string, number>()
const BREAKTHROUGH_BLOCKED_COOLDOWN_SECONDS = 60

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

    // 1b. 洞天福地被动（V2.2 工单 04）：派驻弟子的宗门级加成
    const caveHeavenEffects = aggregateCaveHeavenEffects(
      sect.characters.reduce((max, c) => Math.max(max, c.realm), 0),
      sect.caveHeavenAssignments ?? {},
      sect.characters
    )

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

    // 4f. Apply spirit tide cycle modifiers
    const tideState = getTideState(sect.stats.totalPlayTime)
    rates.spiritEnergy *= tideState.multipliers.spiritEnergy
    rates.herb *= tideState.multipliers.herb
    rates.ore *= tideState.multipliers.ore
    rates.spiritStone *= tideState.multipliers.spiritStone

    // 4g. Realm-economy coupling: stone income scales with the realm the sect
    // is saving for (target = bestRealm + 1) so exponential breakthrough costs
    // (realms.ts) stay reachable.
    const bestRealm = sect.characters.reduce((max, c) => Math.max(max, c.realm), 0)
    const realmEconomyMult = getRealmEconomyMult(bestRealm + 1)
    // 4h. Ascension-tree resource multipliers (resource branch)
    const legacyStoneMult = getLegacyStoneMult(sect.legacyTree)
    const legacyEnergyMult = getLegacyEnergyMult(sect.legacyTree)
    const legacyEssenceMult = getLegacyDaoEssenceMult(sect.legacyTree)
    // 4i. Building Milestone resource multipliers (V2.1 工单 03)
    const milestoneStoneMult = getSectMilestoneRateMult(sect.buildings, 'spiritStone')
    const milestoneEnergyMult = getSectMilestoneRateMult(sect.buildings, 'spiritEnergy')
    const milestoneHerbMult = getSectMilestoneRateMult(sect.buildings, 'herb')
    const milestoneOreMult = getSectMilestoneRateMult(sect.buildings, 'ore')
    // 4j. 仙界建筑产出（V2.1 工单 07）：与凡界产出同乘区（economyMult/legacy/milestone）
    const immortalVein = sect.buildings.find((b) => b.type === 'immortalVein')
    const immortalField = sect.buildings.find((b) => b.type === 'immortalField')
    if (immortalVein?.unlocked && immortalVein.level > 0) {
      rates.spiritStone += getImmortalVeinStoneRate(immortalVein.level)
    }
    if (immortalField?.unlocked && immortalField.level > 0) {
      rates.spiritEnergy += getImmortalFieldEnergyRate(immortalField.level)
      rates.herb += getImmortalFieldHerbRate(immortalField.level)
    }
    const genesisResourceMult = getGenesisResourceMult(sect.genesisTree)
    rates.spiritStone *=
      realmEconomyMult *
      legacyStoneMult *
      legacyEssenceMult *
      milestoneStoneMult *
      genesisResourceMult *
      (1 + caveHeavenEffects.resourceMult.spiritStone)
    rates.herb *=
      realmEconomyMult *
      legacyEssenceMult *
      milestoneHerbMult *
      genesisResourceMult *
      (1 + caveHeavenEffects.resourceMult.herb)
    rates.ore *=
      realmEconomyMult *
      legacyEssenceMult *
      milestoneOreMult *
      genesisResourceMult *
      (1 + caveHeavenEffects.resourceMult.ore)
    rates.spiritEnergy *=
      legacyEnergyMult *
      legacyEssenceMult *
      milestoneEnergyMult *
      genesisResourceMult *
      (1 + caveHeavenEffects.resourceMult.spiritEnergy)

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
      if (!building || !building.unlocked || building.level === 0) continue
      // V2.1 工单 05：自动炼丹续产（灵田 Lv25 里程碑解锁）——空队列自动续上上一配方
      if (
        !building.productionQueue.recipeId &&
        bType === 'alchemyFurnace' &&
        isCapabilityUnlocked(sect.buildings, 'autoAlchemy')
      ) {
        const lastRecipe = sect.automationSettings.lastRecipes?.[bType]
        if (lastRecipe && canStartRecipe(lastRecipe, building.level) && sect.vault.length < sect.maxVaultSlots) {
          building.productionQueue = { recipeId: lastRecipe, progress: 0 }
        }
      }
      if (!building.productionQueue.recipeId) continue
      const routeSpeedBonus =
        calcBuildingRouteBonus(sect.activeRoute, bType) *
        (bType === 'alchemyFurnace' ? getSectMilestoneAlchemyThroughput(sect.buildings) : 1)
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
    // V2.1 工单 04：灵气消耗随境界 ×2 缩放，逐弟子按各自境界求和
    const cultivatingCharacters = sect.characters.filter((c) => c.status === 'idle')
    const cultivatingCount = cultivatingCharacters.length
    const spiritConsumed =
      cultivatingCharacters.reduce((sum, c) => sum + calcSpiritCostPerSecond(c.realm), 0) * deltaSec

    // 7. Spirit ratio
    let spiritRatio = 1
    if (cultivatingCount > 0) {
      spiritRatio = Math.min(1, (sect.resources.spiritEnergy + spiritProduced) / spiritConsumed)
    }

    // 8. Add spirit energy
    let updatedSpiritEnergy = sect.resources.spiritEnergy + spiritProduced

    // 9. Process each character
    let breakthroughStoneCost = 0
    let breakthroughHerbCost = 0
    let statBreakthroughAttempts = 0
    let statBreakthroughSuccesses = 0
    let unlockedFirstTribulationSuccess = false
    const realmsReachedByBreakthrough: Set<number> = new Set()
    const pathAssignedEvents: string[] = []
    const levelUpEvents: string[] = []
    const breakthroughDeaths: Character[] = []
    // 藏经阁基础修炼效率 + 建筑 Milestone 修炼倍率（共享实现见 ProgressForecast）
    // 仙宫（工单 07）+ 本源树（工单 09）：全局与分段修炼乘区
    const immortalPalace = sect.buildings.find((b) => b.type === 'immortalPalace')
    const genesisSegmentMult = (realm: number) =>
      realm >= 9 ? getGenesisImmortalSpeedMult(sect.genesisTree) : getGenesisMortalSpeedMult(sect.genesisTree)
    const buildingCultivationMult =
      getBuildingCultivationMult(sect) *
      getImmortalPalaceCultivationMult(immortalPalace?.level ?? 0) *
      getGenesisCultivationMult(sect.genesisTree)
    void genesisSegmentMult
    const updatedCharacters = sect.characters.map((char) => {
      // Branch 1: idle characters auto-cultivate
      if (char.status === 'idle') {
        const effectiveSpirit = calcSpiritCostPerSecond(char.realm) * spiritRatio * deltaSec

        // --- Cultivation event processing ---
        const legacyRateMult =
          getLegacyCultivationMult(sect.legacyTree) *
          getLegacyDaoEssenceMult(sect.legacyTree) *
          buildingCultivationMult *
          (char.realm >= 9
            ? getGenesisImmortalSpeedMult(sect.genesisTree)
            : getGenesisMortalSpeedMult(sect.genesisTree))
        // V2.2 工单 03：装备词条"悟道/静修"修炼速率乘区
        const eqAffixCultivation = aggregateEquipmentAffixes(
          char.equippedGear.map((id: string | null) =>
            id ? (findEqForAffix(sect, id) as import('../../types/item').Equipment | undefined) : undefined
          )
        ).cultivationMult
        const legacyRateMultWithGear =
          legacyRateMult * (1 + eqAffixCultivation) * (1 + caveHeavenEffects.cultivationMult)
        const cultivationRate = calcCultivationRate(char, char.learnedTechniques, legacyRateMultWithGear)
        const eventResult = processCultivationEvent(char, cultivationRate, deltaSec)

        // Emit event messages (new event started or ended)
        if (eventResult.message) {
          emitEvent('milestone', eventResult.message)
        }

        const result = cultivationTick(char, effectiveSpirit, deltaSec, char.learnedTechniques, legacyRateMult)
        // V2.2 工单 03：装备词条"剑意/参悟"熟练度增长乘区
        {
          const eqAffixMastery = aggregateEquipmentAffixes(
            char.equippedGear.map((id: string | null) =>
              id ? (findEqForAffix(sect, id) as import('../../types/item').Equipment | undefined) : undefined
            )
          ).masteryMult
          if (eqAffixMastery > 0 && result.comprehensionGrowth) {
            for (const key of Object.keys(result.comprehensionGrowth)) {
              result.comprehensionGrowth[key] *= 1 + eqAffixMastery
            }
          }
        }
        // Apply event modifier and archetype/campaign multipliers
        const gained =
          (result.cultivationGained * eventResult.cultivationMultiplier + eventResult.extraCultivation) *
          archMods.cultivationMultiplier *
          campMods.cultivationEfficiency

        let updatedChar: Character = {
          ...char,
          cultivation: char.cultivation + gained,
          totalCultivation: char.totalCultivation + gained,
          cultivationEvent: eventResult.event,
        }

        const xpGain = Math.max(0, gained / 5)
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

        // Auto-breakthrough: delegate to pure coordinator. Loop so one delta
        // (especially offline catch-up) can traverse several stages while
        // cultivation overshoots; bounded to keep a single tick cheap.
        // V2.1 工单 05：小境界自动突破元婴解锁、大境界化神解锁——前期手动建立心智。
        const autoMinorEnabled = sect.automationSettings.autoBreakthrough && bestRealm >= 3
        const autoMajorEnabled = (sect.automationSettings.autoMajorBreakthrough ?? false) && bestRealm >= 4
        let btAttempts = 0
        while (autoMinorEnabled && canBreakthrough(updatedChar) && btAttempts < 40 && updatedChar.status === 'idle') {
          // 大境界圆满（stage 3 冲下一境）需另受"大境界自动突破"门控
          if (updatedChar.realmStage >= 3 && !autoMajorEnabled) break
          btAttempts++
          const btResult = processBreakthrough(
            updatedChar,
            sect.resources.spiritStone - breakthroughStoneCost,
            updatedSpiritEnergy,
            get().sect.techniqueCodex,
            { spiritStone: breakthroughStoneCost, spiritEnergy: 0, herb: breakthroughHerbCost },
            pathEffectMap,
            undefined,
            sect.resources.herb - breakthroughHerbCost,
            getLegacyBreakthroughBonus(sect.legacyTree) +
              getGenesisBreakthroughBonus(sect.genesisTree) +
              caveHeavenEffects.breakthroughBonus
          )

          updatedChar = btResult.updatedChar
          breakthroughStoneCost += btResult.resourceCost.spiritStone
          breakthroughHerbCost += btResult.resourceCost.herb
          statBreakthroughAttempts += btResult.attemptsCount
          statBreakthroughSuccesses += btResult.successesCount

          for (const event of btResult.events) {
            if (event.type === 'breakthrough_blocked') {
              const now = Date.now()
              const lastEmitted = breakthroughBlockedCooldown.get(updatedChar.id) ?? 0
              if (now - lastEmitted < BREAKTHROUGH_BLOCKED_COOLDOWN_SECONDS * 1000) continue
              breakthroughBlockedCooldown.set(updatedChar.id, now)
            } else {
              // Clear cooldown on successful or failed breakthrough
              breakthroughBlockedCooldown.delete(updatedChar.id)
            }
            emitEvent(event.type, event.message)
          }

          if (btResult.died) {
            breakthroughDeaths.push(updatedChar)
          }

          // Handle gradient breakthrough outcomes
          if (btResult.outcome === 'injured' && btResult.injuryTimer > 0) {
            updatedChar = {
              ...updatedChar,
              status: 'injured',
              injuryTimer: btResult.injuryTimer,
            }
          }

          if (btResult.unlockedTribulationMilestone) {
            unlockedFirstTribulationSuccess = true
          }

          if (btResult.breakthroughSuccess) {
            realmsReachedByBreakthrough.add(btResult.updatedChar.realm)
            // V2.2 工单 05：道祖榜纪录判定（渡劫/道祖最快到达，秒表 = totalPlayTime）
            const playSeconds = sect.stats.totalPlayTime + deltaSec
            if (btResult.updatedChar.realm === 8) {
              const old = attemptRecord(sect.stats, 'fastestTribulationSeconds', playSeconds)
              if (old !== null)
                emitEvent(
                  'milestone',
                  `打破纪录！最快渡劫 ${(playSeconds / 86400).toFixed(2)} 天（原 ${(old / 86400).toFixed(2)} 天）`
                )
            }
            if (btResult.updatedChar.realm === 12) {
              const old = attemptRecord(sect.stats, 'fastestDaozuSeconds', playSeconds)
              if (old !== null)
                emitEvent(
                  'milestone',
                  `打破纪录！最快道祖 ${(playSeconds / 86400).toFixed(2)} 天（原 ${(old / 86400).toFixed(2)} 天）`
                )
            }
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

          // Stop conditions: death/injury/blocked retry next tick; empty
          // attempts mean resources ran out (blocked event already emitted).
          if (
            btResult.died ||
            btResult.outcome === 'injured' ||
            btResult.outcome === 'blocked' ||
            btResult.attemptsCount === 0
          ) {
            break
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

    // Dynamic vault capacity: 50 + (mainHallLevel - 1) * 20
    const dynamicMaxVaultSlots = 50 + (mhLevel - 1) * 20

    // V2.1 工单 05：自动出售凡品（灵矿 Lv25 里程碑解锁）——仓库接近满位时清理凡品装备
    let vaultAfterSweep = newVault
    let sweepStoneGain = 0
    let sweepOreGain = 0
    let autoSellSweptCount = 0
    if (
      isCapabilityUnlocked(sect.buildings, 'autoSellJunk') &&
      newVault.length >= Math.floor(dynamicMaxVaultSlots * 0.8)
    ) {
      const keepStacks: typeof newVault = []
      let sweptCount = 0
      for (const stack of newVault) {
        if (stack.item.quality === 'common') {
          // V2.2 工单 03：分解语义——半价灵石 + 等值矿材（高于直接出售）
          const value = stack.item.sellPrice * stack.quantity
          sweepStoneGain += Math.floor(value / 2)
          sweepOreGain += Math.floor(value / 4)
          sweptCount += stack.quantity
        } else {
          keepStacks.push(stack)
        }
      }
      if (sweepStoneGain > 0 || sweepOreGain > 0) {
        vaultAfterSweep = keepStacks
        autoSellSweptCount = sweptCount
      }
    }

    const newResources = {
      spiritEnergy: Math.max(0, updatedSpiritEnergy),
      spiritStone: Math.max(
        0,
        sect.resources.spiritStone +
          mineStoneProduced +
          taxProduced +
          sweepStoneGain -
          totalConsumed.spiritStone -
          breakthroughStoneCost
      ),
      herb: sect.resources.herb + rates.herb * deltaSec - totalConsumed.herb - breakthroughHerbCost,
      ore: sect.resources.ore + rates.ore * deltaSec - totalConsumed.ore + sweepOreGain,
    }

    const overflowTriggerRatio = Math.min(0.98, Math.max(0.5, sect.automationSettings.overflowTriggerRatio ?? 0.9))
    // Realm stone floor guarantees storage room for 10× the next breakthrough cost.
    const stoneCap = getSectStoneCap(mhLevel, bestRealm)
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
      // V2.1 工单 04：灵气供给不足的时长归因（离线报告展示）
      lowSpiritSeconds: (prevAcc.lowSpiritSeconds ?? 0) + (spiritRatio < 0.95 ? deltaSec : 0),
      kills: prevAcc.kills ?? 0,
      equipmentGained: prevAcc.equipmentGained ?? 0,
      equipmentSold: (prevAcc.equipmentSold ?? 0) + autoSellSweptCount,
      dungeonRuns: prevAcc.dungeonRuns ?? 0,
      dungeonFloorsCleared: prevAcc.dungeonFloorsCleared ?? 0,
    }

    // Calculate spirit stone income for stats
    const spiritStoneEarned = mineStoneProduced + taxProduced + overflowStoneEarned + sweepStoneGain

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

    // V2.1 工单 05：境界突破时刻的自动化解锁反馈（"从此这件事自动发生"）
    for (const realm of realmsReachedByBreakthrough) {
      for (const item of getAutomationsUnlockedAtRealm(realm)) {
        emitEvent('milestone', `自动化解锁：${item.name}——${item.description}`)
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
      vault: vaultAfterSweep,
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
        peakCultivationThisRun: Math.max(
          sect.stats.peakCultivationThisRun ?? 0,
          ...updatedCharacters.map((c) => c.totalCultivation),
          0
        ),
      },
    }

    // --- Random Events ---
    // Evaluate random events using the pure system function. Event count scales
    // with the elapsed duration (Poisson sampling), so offline catch-ups roll a
    // statistically equivalent set of events instead of a single roll.
    const randomEvents = evaluateRandomEventsForDelta(sect, deltaSec, sect.lastRandomEventTime ?? 0)
    let sectWithEvent = newSect
    const randomEventLevelUps: string[] = []

    for (const randomEventResult of randomEvents) {
      if (!randomEventResult.event) continue
      // Apply resource effects
      const eventResources = { ...sectWithEvent.resources }
      for (const effect of randomEventResult.effects) {
        if (effect.type === 'resource' && effect.target) {
          const key = effect.target as keyof typeof eventResources
          if (key in eventResources) {
            eventResources[key] = Math.max(0, eventResources[key] + effect.value)
          }
        }
      }

      // Apply character experience effects to a random idle character
      let eventCharacters = sectWithEvent.characters
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
        ...sectWithEvent,
        resources: eventResources,
        characters: eventCharacters,
        lastRandomEventTime: sectWithEvent.stats.totalPlayTime,
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

        // Auto-recruit runs every day (V2.1 工单 05：元婴期解锁)
        let currentState = get()
        while (
          bestRealm >= 3 &&
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

      // 自动飞升（天机推演节点 + 开关 + 道韵预期门槛）
      const autoAscendSect = get().sect
      if (autoAscendSect.automationSettings.autoAscend && isAutoAscendUnlocked(autoAscendSect.legacyTree)) {
        const highestRealm = autoAscendSect.characters.reduce((max, c) => Math.max(max, c.realm), 0)
        const expectedDaoYun = calcDaoYunGain(
          autoAscendSect.stats.peakCultivationThisRun ?? 0,
          highestRealm,
          autoAscendSect.legacy.ascensionCount
        )
        if (
          expectedDaoYun >= (autoAscendSect.automationSettings.autoAscendMinDaoYun ?? 0) &&
          checkCanAscend(autoAscendSect).canAscend
        ) {
          get().performAscension()
          return { spiritProduced: 0, spiritConsumed: 0 }
        }
      }

      // 自动证道（天机证道节点 + 开关 + 本源预期门槛，工单 09）
      const autoProveSect = get().sect
      if (
        (autoProveSect.automationSettings.autoProveDao ?? false) &&
        shouldAutoProveDao(autoProveSect, autoProveSect.automationSettings.autoProveMinGenesis ?? 0)
      ) {
        get().proveDao()
        return { spiritProduced: 0, spiritConsumed: 0 }
      }

      // Expire stale route opportunities
      const currentSect = get().sect
      if (currentSect.routeOpportunities.length > 0) {
        const filtered = expireRouteOpportunities(
          currentSect.routeOpportunities,
          gameState.currentGameDay,
          currentSect.autoRunDayCounter
        )
        if (filtered.length !== currentSect.routeOpportunities.length) {
          set((s) => ({
            sect: {
              ...s.sect,
              routeOpportunities: filtered,
            },
          }))
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
