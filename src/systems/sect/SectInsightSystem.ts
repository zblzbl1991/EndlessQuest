import type { Character } from '../../types/character'

export interface CharacterStatusSummaryItem {
  key: 'cultivating' | 'dispatching' | 'adventuring' | 'training' | 'recovering'
  label: string
  count: number
}

export function getSectCharacterStatusSummary(characters: Character[]): CharacterStatusSummaryItem[] {
  return [
    { key: 'cultivating', label: '修炼中', count: characters.filter((char) => char.status === 'idle').length },
    { key: 'dispatching', label: '派遣中', count: characters.filter((char) => char.status === 'patrolling').length },
    { key: 'adventuring', label: '秘境中', count: characters.filter((char) => char.status === 'adventuring').length },
    { key: 'training', label: '研习中', count: characters.filter((char) => char.status === 'training').length },
    {
      key: 'recovering',
      label: '恢复中',
      count: characters.filter((char) => char.status === 'resting' || char.status === 'injured').length,
    },
  ]
}
