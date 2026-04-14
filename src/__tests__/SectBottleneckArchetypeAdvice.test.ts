import { describe, it, expect } from 'vitest'
import type { SectArchetype } from '../types/sect'
import { getArchetypeBottleneckAdvice, getAllArchetypeAdvices } from '../systems/sect/ArchetypeBottleneckAdvisor'

describe('ArchetypeBottleneckAdvisor', () => {
  it('returns different advice for each archetype on recovering bottleneck', () => {
    const swordAdvice = getArchetypeBottleneckAdvice('recovering', 'swordBurst')
    const pillAdvice = getArchetypeBottleneckAdvice('recovering', 'pillSustain')
    const arrayAdvice = getArchetypeBottleneckAdvice('recovering', 'arrayGuard')
    const beastAdvice = getArchetypeBottleneckAdvice('recovering', 'beastHarvest')

    expect(swordAdvice.suggestion).toContain('爆发')
    expect(pillAdvice.suggestion).toContain('恢复专项')
    expect(arrayAdvice.suggestion).toContain('保守')
    expect(beastAdvice.suggestion).toContain('采集')

    // All should be different
    const suggestions = [swordAdvice.suggestion, pillAdvice.suggestion, arrayAdvice.suggestion, beastAdvice.suggestion]
    const uniqueSuggestions = new Set(suggestions)
    expect(uniqueSuggestions.size).toBe(4)
  })

  it('returns advice with action summary for all bottlenecks', () => {
    const bottleneckIds = [
      'spiritEnergy',
      'spiritStone',
      'herb',
      'ore',
      'disciples',
      'recovering',
      'expedition',
      'stable',
    ]
    for (const id of bottleneckIds) {
      for (const archetype of ['swordBurst', 'pillSustain', 'arrayGuard', 'beastHarvest'] as SectArchetype[]) {
        const advice = getArchetypeBottleneckAdvice(id, archetype)
        expect(advice.suggestion).toBeTruthy()
        expect(advice.actionSummary).toBeTruthy()
        expect(advice.archetype).toBe(archetype)
      }
    }
  })

  it('returns fallback for unknown bottleneck', () => {
    const advice = getArchetypeBottleneckAdvice('unknown_bottleneck', 'swordBurst')
    expect(advice.suggestion).toContain('暂无')
  })

  it('getAllArchetypeAdvices returns 4 advices', () => {
    const advices = getAllArchetypeAdvices('recovering')
    expect(advices.length).toBe(4)
    const archetypes = advices.map((a) => a.archetype)
    expect(archetypes).toContain('swordBurst')
    expect(archetypes).toContain('pillSustain')
    expect(archetypes).toContain('arrayGuard')
    expect(archetypes).toContain('beastHarvest')
  })

  it('stable bottleneck gives different suggestions per archetype', () => {
    const swordAdvice = getArchetypeBottleneckAdvice('stable', 'swordBurst')
    const pillAdvice = getArchetypeBottleneckAdvice('stable', 'pillSustain')
    expect(swordAdvice.suggestion).not.toBe(pillAdvice.suggestion)
  })
})
