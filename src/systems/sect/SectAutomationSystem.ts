import { getCharacterDisposition } from '../character/CharacterDispositionSystem'
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
