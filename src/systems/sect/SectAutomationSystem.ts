import { getCharacterDisposition } from '../character/CharacterDispositionSystem'
import type { AdventureRunConfig, Dungeon, SectAutomationSettings } from '../../types'
import type { Character } from '../../types'

export interface AutoRecruitCheckInput {
  poolSize: number
  targetPoolSize: number
  spiritStone: number
  reserveSpiritStone: number
  spiritEnergy: number
  reserveSpiritEnergy: number
}

export function shouldAutoRecruit(input: AutoRecruitCheckInput): boolean {
  return (
    input.poolSize < input.targetPoolSize &&
    input.spiritStone > input.reserveSpiritStone &&
    input.spiritEnergy > input.reserveSpiritEnergy
  )
}

export function pickAutomationTeam(characters: Character[], maxTeamSize = 5): string[] {
  return characters
    .filter((character) => character.status === 'idle' && Math.max(0, character.recoveryDaysRemaining ?? 0) === 0)
    .sort((left, right) => {
      const leftDisposition = getCharacterDisposition(left)
      const rightDisposition = getCharacterDisposition(right)
      const leftScore = leftDisposition.adventure.score + leftDisposition.risk.score * 0.5
      const rightScore = rightDisposition.adventure.score + rightDisposition.risk.score * 0.5
      return rightScore - leftScore
    })
    .slice(0, maxTeamSize)
    .map((character) => character.id)
}

function isDungeonUnlockedForAutomation(dungeon: Dungeon, playerRealm: number, playerStage: number): boolean {
  return (
    playerRealm > dungeon.unlockRealm || (playerRealm === dungeon.unlockRealm && playerStage >= dungeon.unlockStage)
  )
}

function mapAutomationStyle(
  casualtyTolerance: SectAutomationSettings['casualtyTolerance']
): Pick<AdventureRunConfig, 'automationStrategy' | 'tacticalPreset'> {
  if (casualtyTolerance === 'conservative') {
    return {
      automationStrategy: 'steady',
      tacticalPreset: 'conservative',
    }
  }

  if (casualtyTolerance === 'risky') {
    return {
      automationStrategy: 'combat',
      tacticalPreset: 'burst',
    }
  }

  return {
    automationStrategy: 'steady',
    tacticalPreset: 'balanced',
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
}): AdventureRunConfig | null {
  if (!input.settings.enabled || !input.settings.preferredDungeonId) return null
  if (
    input.spiritStone <= input.settings.reserveSpiritStone ||
    input.spiritEnergy <= input.settings.reserveSpiritEnergy
  ) {
    return null
  }

  const dungeon = input.dungeons.find((item) => item.id === input.settings.preferredDungeonId)
  if (!dungeon || !isDungeonUnlockedForAutomation(dungeon, input.playerRealm, input.playerStage)) {
    return null
  }

  const teamCharacterIds = pickAutomationTeam(input.characters)
  if (teamCharacterIds.length === 0) return null

  return {
    dungeonId: dungeon.id,
    teamCharacterIds,
    supplyLevel: 'basic',
    ...mapAutomationStyle(input.settings.casualtyTolerance),
  }
}
