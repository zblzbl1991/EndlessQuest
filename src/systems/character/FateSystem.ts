import type { FateTag } from '../../types/character'

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
