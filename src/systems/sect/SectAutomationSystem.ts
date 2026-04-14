import { getCharacterDisposition } from '../character/CharacterDispositionSystem'
import type {
  AdventureRunConfig,
  Dungeon,
  ExpeditionTemplate,
  SectAutomationSettings,
  SectArchetype,
  RiskTier,
} from '../../types'
import type { Character } from '../../types'
import { getVisibleExpeditionTemplates } from '../../data/expeditionTemplates'

export interface AutoRecruitCheckInput {
  spiritStone: number
  reserveSpiritStone: number
  spiritEnergy: number
  reserveSpiritEnergy: number
}

/** 资源超过保底线即允许自动补员，上限由 addCharacter 中的 calcMaxDisciplesByResources 控制 */
export function shouldAutoRecruit(input: AutoRecruitCheckInput): boolean {
  return input.spiritStone > input.reserveSpiritStone && input.spiritEnergy > input.reserveSpiritEnergy
}

function rankCharactersForAutomation(characters: Character[]): Character[] {
  return characters
    .filter((character) => character.status === 'idle' && Math.max(0, character.recoveryDaysRemaining ?? 0) === 0)
    .sort((left, right) => {
      const leftDisposition = getCharacterDisposition(left)
      const rightDisposition = getCharacterDisposition(right)
      const leftScore = leftDisposition.adventure.score + leftDisposition.risk.score * 0.5
      const rightScore = rightDisposition.adventure.score + rightDisposition.risk.score * 0.5
      return rightScore - leftScore
    })
}

export function pickAutomationTeam(
  characters: Character[],
  maxTeamSize = 5,
  teamRule: ExpeditionTemplate['teamRule'] = 'balanced'
): string[] {
  const ranked = rankCharactersForAutomation(characters)

  if (teamRule === 'reserveCore' && ranked.length > maxTeamSize) {
    return ranked.slice(1, maxTeamSize + 1).map((character) => character.id)
  }

  if (teamRule === 'topPower') {
    return [...ranked]
      .sort((left, right) => {
        const leftPower = left.realm * 8 + left.realmStage * 2 + left.baseStats.atk + left.baseStats.def
        const rightPower = right.realm * 8 + right.realmStage * 2 + right.baseStats.atk + right.baseStats.def
        return rightPower - leftPower
      })
      .slice(0, maxTeamSize)
      .map((character) => character.id)
  }

  return ranked.slice(0, maxTeamSize).map((character) => character.id)
}

function isDungeonUnlockedForAutomation(
  dungeon: Dungeon,
  playerRealm: number,
  playerStage: number,
  unlockedLegacyDungeonIds: string[] = []
): boolean {
  const realmUnlocked =
    playerRealm > dungeon.unlockRealm || (playerRealm === dungeon.unlockRealm && playerStage >= dungeon.unlockStage)

  if (!realmUnlocked) return false
  if (!dungeon.legacyUnlockId) return true

  return unlockedLegacyDungeonIds.includes(dungeon.legacyUnlockId)
}

function mapAutomationStyle(
  casualtyTolerance: SectAutomationSettings['casualtyTolerance'],
  rewardFocus: ExpeditionTemplate['rewardFocus']
): Pick<AdventureRunConfig, 'automationStrategy' | 'tacticalPreset'> {
  const automationStrategy =
    rewardFocus === 'progress' ? 'combat' : rewardFocus === 'techniques' || rewardFocus === 'pets' ? 'profit' : 'steady'

  if (casualtyTolerance === 'conservative') {
    return {
      automationStrategy,
      tacticalPreset: 'conservative',
    }
  }

  if (casualtyTolerance === 'risky') {
    return {
      automationStrategy: automationStrategy === 'steady' ? 'combat' : automationStrategy,
      tacticalPreset: 'burst',
    }
  }

  return {
    automationStrategy,
    tacticalPreset: 'balanced',
  }
}

/** Apply archetype and risk tier modifiers to the run config */
function applyArchetypeRiskModifiers(
  config: AdventureRunConfig,
  archetype: SectArchetype | undefined,
  riskTier: RiskTier | undefined
): AdventureRunConfig {
  if (!archetype && !riskTier) return config

  let { automationStrategy, tacticalPreset, supplyLevel } = config

  // Archetype influence on strategy
  if (archetype === 'swordBurst') {
    // Sword burst prefers combat
    if (automationStrategy === 'steady') automationStrategy = 'combat'
  } else if (archetype === 'pillSustain') {
    // Pill sustain prefers steady
    if (automationStrategy === 'combat') automationStrategy = 'steady'
  }

  // Risk tier influence on tactics and supply
  if (riskTier === 'gamble' || riskTier === 'destiny') {
    // High risk: more aggressive tactics, higher supply
    if (tacticalPreset === 'conservative') tacticalPreset = 'balanced'
    if (supplyLevel === 'basic') supplyLevel = 'enhanced'
  } else if (riskTier === 'safe') {
    // Safe: conservative tactics
    if (tacticalPreset === 'burst') tacticalPreset = 'balanced'
  }

  return {
    ...config,
    automationStrategy,
    tacticalPreset,
    supplyLevel,
  }
}

export function buildAutomationRunConfig(input: {
  settings: SectAutomationSettings
  characters: Character[]
  dungeons: Dungeon[]
  spiritStone: number
  spiritEnergy: number
  playerRealm: number
  playerStage: number
  ascensionCount?: number
  unlockedLegacyDungeonIds?: string[]
  archiveMilestones?: import('../../types').ArchiveMilestoneEntry[]
}): AdventureRunConfig | null {
  const availableTemplates = getVisibleExpeditionTemplates(
    input.settings.expeditionTemplates,
    input.ascensionCount ?? 0,
    input.archiveMilestones ?? []
  )
  const activeTemplate = availableTemplates.find((template) => template.id === input.settings.activeTemplateId)
  const targetDungeonId = activeTemplate?.enabled ? activeTemplate.dungeonId : input.settings.preferredDungeonId
  const targetRiskTolerance = activeTemplate?.enabled ? activeTemplate.riskTolerance : input.settings.casualtyTolerance
  const rewardFocus = activeTemplate?.enabled ? activeTemplate.rewardFocus : 'resources'
  const supplyLevel = activeTemplate?.enabled ? activeTemplate.supplyLevel : 'basic'
  const teamRule = activeTemplate?.enabled ? activeTemplate.teamRule : 'balanced'

  if (!targetDungeonId) return null
  if (
    input.spiritStone <= input.settings.reserveSpiritStone ||
    input.spiritEnergy <= input.settings.reserveSpiritEnergy
  ) {
    return null
  }

  const dungeon = input.dungeons.find((item) => item.id === targetDungeonId)
  if (
    !dungeon ||
    !isDungeonUnlockedForAutomation(dungeon, input.playerRealm, input.playerStage, input.unlockedLegacyDungeonIds ?? [])
  ) {
    return null
  }

  const teamCharacterIds = pickAutomationTeam(input.characters, 5, teamRule)
  if (teamCharacterIds.length === 0) return null

  const baseConfig: AdventureRunConfig = {
    dungeonId: dungeon.id,
    teamCharacterIds,
    supplyLevel,
    ...mapAutomationStyle(targetRiskTolerance, rewardFocus),
  }

  // Apply archetype + risk tier modifier layer
  const riskTier = activeTemplate?.riskTier
  const archetype = input.settings.routeShift?.currentArchetype
  return applyArchetypeRiskModifiers(baseConfig, archetype, riskTier)
}
