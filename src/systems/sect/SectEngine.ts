// src/systems/sect/SectEngine.ts

import {
  calcSectLevel,
  getMaxCharacters,
  getMaxSimultaneousRuns,
} from '../character/CharacterEngine'

// Re-export for convenience and semantic grouping under the sect module.
export { calcSectLevel, getMaxCharacters, getMaxSimultaneousRuns }

/**
 * Check whether a new character can be recruited given the current sect level
 * and the number of characters already in the sect.
 */
export function canRecruitCharacter(sectLevel: number, currentCount: number): boolean {
  return currentCount < getMaxCharacters(sectLevel)
}
