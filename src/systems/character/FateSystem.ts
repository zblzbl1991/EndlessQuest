import type { Character, FateTag, FateTagId } from '../../types/character'

const FATE_TAG_ID_TO_CANONICAL: Record<FateTagId, FateTag> = {
  'tribulation-scar': 'tribulationScar',
  'heart-devil': 'heartDevilSeed',
  'sudden-insight': 'suddenInsight',
  'stable-dao-heart': 'stableDaoHeart',
}

const FATE_TAG_CANONICAL_TO_ID: Record<FateTag, FateTagId> = {
  tribulationScar: 'tribulation-scar',
  heartDevilSeed: 'heart-devil',
  suddenInsight: 'sudden-insight',
  stableDaoHeart: 'stable-dao-heart',
}

export function addFateTag(tags: FateTag[], tag: FateTag): FateTag[] {
  return tags.includes(tag) ? tags : [...tags, tag]
}

export function resolveSuccessfulBreakthroughFates(
  tags: FateTag[],
  options: { tribulation: boolean; failureRate: number }
): FateTag[] {
  let nextTags = tags
  if (options.tribulation) {
    nextTags = addFateTag(nextTags, 'stableDaoHeart')
  }
  if (options.failureRate >= 0.35) {
    nextTags = addFateTag(nextTags, 'suddenInsight')
  }
  return nextTags
}

export function resolveTribulationFailureFates(tags: FateTag[], severe: boolean): FateTag[] {
  return addFateTag(tags, severe ? 'tribulationScar' : 'heartDevilSeed')
}

function addLegacyFateTag(tags: FateTagId[], tag: FateTagId): FateTagId[] {
  return tags.includes(tag) ? tags : [...tags, tag]
}

function toLegacyTagIds(tags: FateTag[]): FateTagId[] {
  return tags.map((tag) => FATE_TAG_CANONICAL_TO_ID[tag])
}

function fromLegacyTagIds(tags: Array<FateTag | FateTagId>): FateTag[] {
  return tags.map((tag) => {
    if (tag in FATE_TAG_ID_TO_CANONICAL) {
      return FATE_TAG_ID_TO_CANONICAL[tag as FateTagId]
    }
    return tag as FateTag
  })
}

export function applyFateOnTribulation(
  character: Character,
  success: boolean,
  severe: boolean
): { tagsAdded: FateTagId[] } {
  const currentTags = toLegacyTagIds(fromLegacyTagIds(character.fateTags))
  let nextTags = currentTags

  if (success) {
    nextTags = addLegacyFateTag(nextTags, 'sudden-insight')
  } else {
    nextTags = addLegacyFateTag(nextTags, severe ? 'tribulation-scar' : 'heart-devil')
  }

  return {
    tagsAdded: nextTags.filter((tag) => !currentTags.includes(tag)),
  }
}

export function applyFateOnBreakthrough(
  character: Character,
  success: boolean,
  isMajorBreakthrough: boolean
): { tagsAdded: FateTagId[] } {
  if (!success || !isMajorBreakthrough) {
    return { tagsAdded: [] }
  }

  const currentTags = toLegacyTagIds(fromLegacyTagIds(character.fateTags))
  const nextTags = addLegacyFateTag(currentTags, 'stable-dao-heart')

  return {
    tagsAdded: nextTags.filter((tag) => !currentTags.includes(tag)),
  }
}
