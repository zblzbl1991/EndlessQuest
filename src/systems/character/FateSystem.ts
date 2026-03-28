import type { FateTagId, Character } from '../../types/character'

export interface FateApplyResult {
  /** Tags that were newly added (excluding duplicates) */
  tagsAdded: FateTagId[]
}

/**
 * Apply fate tags after a tribulation outcome.
 *
 * - Failed tribulation with severe outcome: add 'tribulation-scar'
 * - Failed tribulation without severe outcome: add 'heart-devil'
 * - Successful tribulation: add 'sudden-insight'
 *
 * Tags are not duplicated — if a character already has a tag, it is not added again.
 */
export function applyFateOnTribulation(
  char: Character,
  tribulationSucceeded: boolean,
  severe: boolean,
): FateApplyResult {
  const tagsAdded: FateTagId[] = []
  const existing = new Set(char.fateTags)

  if (tribulationSucceeded) {
    if (!existing.has('sudden-insight')) {
      tagsAdded.push('sudden-insight')
    }
  } else if (severe) {
    if (!existing.has('tribulation-scar')) {
      tagsAdded.push('tribulation-scar')
    }
  } else {
    if (!existing.has('heart-devil')) {
      tagsAdded.push('heart-devil')
    }
  }

  return { tagsAdded }
}

/**
 * Apply fate tags after a breakthrough outcome.
 *
 * - Successful major breakthrough (realm transition): add 'stable-dao-heart'
 * - Successful minor breakthrough: no fate tag
 * - Failed breakthrough: no fate tag (fate from tribulation is separate)
 *
 * Tags are not duplicated.
 */
export function applyFateOnBreakthrough(
  char: Character,
  succeeded: boolean,
  isMajorBreakthrough: boolean,
): FateApplyResult {
  const tagsAdded: FateTagId[] = []
  const existing = new Set(char.fateTags)

  if (succeeded && isMajorBreakthrough) {
    if (!existing.has('stable-dao-heart')) {
      tagsAdded.push('stable-dao-heart')
    }
  }

  return { tagsAdded }
}
