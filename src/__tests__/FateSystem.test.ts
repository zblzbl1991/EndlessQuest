import { describe, expect, it } from 'vitest'
import {
  addFateTag,
  resolveSuccessfulBreakthroughFates,
  resolveTribulationFailureFates,
} from '../systems/character/FateSystem'

describe('FateSystem', () => {
  it('should add a fate tag only once', () => {
    const tags = addFateTag(['stableDaoHeart'], 'stableDaoHeart')
    expect(tags).toEqual(['stableDaoHeart'])
  })

  it('should reward tribulation success with stableDaoHeart', () => {
    const tags = resolveSuccessfulBreakthroughFates([], { tribulation: true, failureRate: 0.2 })
    expect(tags).toContain('stableDaoHeart')
  })

  it('should reward risky breakthroughs with suddenInsight', () => {
    const tags = resolveSuccessfulBreakthroughFates([], { tribulation: false, failureRate: 0.4 })
    expect(tags).toContain('suddenInsight')
  })

  it('should add tribulationScar on severe tribulation failure', () => {
    const tags = resolveTribulationFailureFates([], true)
    expect(tags).toContain('tribulationScar')
  })

  it('should add heartDevilSeed on non-severe tribulation failure', () => {
    const tags = resolveTribulationFailureFates([], false)
    expect(tags).toContain('heartDevilSeed')
  })
})
