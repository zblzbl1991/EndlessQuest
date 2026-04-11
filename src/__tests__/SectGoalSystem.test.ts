import { describe, expect, it } from 'vitest'
import { DUNGEONS } from '../data/events'
import { createInitialState } from '../stores/sectStore/initial'
import { buildSectStageGoals } from '../systems/sect/SectGoalSystem'
import type { Material } from '../types'

function makeMaterial(id: string, name: string, quality: Material['quality']): Material {
  return {
    id,
    name,
    quality,
    type: 'material',
    description: '',
    sellPrice: 10,
    category: 'other',
  }
}

describe('buildSectStageGoals', () => {
  it('should prioritize upgrading forge before legacy crafting when guixu is unlocked', () => {
    const sect = createInitialState().sect
    sect.legacy.unlockedDungeons = ['guixuRift']
    sect.buildings = sect.buildings.map((building) =>
      building.type === 'forge' ? { ...building, unlocked: true, level: 5 } : building
    )

    const goals = buildSectStageGoals(sect, [], DUNGEONS)
    expect(goals.some((goal) => goal.id === 'legacy_forge_unlock')).toBe(true)
  })

  it('should prompt the player to forge legacy gear when materials are ready', () => {
    const sect = createInitialState().sect
    sect.legacy.unlockedDungeons = ['guixuRift']
    sect.buildings = sect.buildings.map((building) =>
      building.type === 'forge' ? { ...building, unlocked: true, level: 7 } : building
    )
    sect.vault = [
      { item: makeMaterial('tide_1', '归墟潮晶', 'spirit'), quantity: 1 },
      { item: makeMaterial('tide_2', '归墟潮晶', 'spirit'), quantity: 1 },
      { item: makeMaterial('shard_1', '渊息残片', 'divine'), quantity: 1 },
    ]

    const goals = buildSectStageGoals(sect, [], DUNGEONS)
    const legacyGoal = goals.find((goal) => goal.id === 'legacy_forge_ready')

    expect(legacyGoal).toBeDefined()
    expect(legacyGoal?.link).toBe('/buildings')
    expect(legacyGoal?.progress).toContain('2/2')
  })

  it('should keep pointing at guixu materials after the first legacy forge milestone', () => {
    const sect = createInitialState().sect
    sect.legacy.unlockedDungeons = ['guixuRift']
    sect.buildings = sect.buildings.map((building) =>
      building.type === 'forge' ? { ...building, unlocked: true, level: 7 } : building
    )
    sect.archiveMilestones = [{ id: 'firstLegacyForge', unlockedAt: 1 }]
    sect.vault = [{ item: makeMaterial('tide_1', '归墟潮晶', 'spirit'), quantity: 1 }]

    const goals = buildSectStageGoals(sect, [], DUNGEONS)
    const legacyGoal = goals.find((goal) => goal.id === 'legacy_forge_prepare_repeat')

    expect(legacyGoal).toBeDefined()
    expect(legacyGoal?.link).toBe('/adventure')
    expect(legacyGoal?.title).toContain('第二件')
  })

  it('should switch to resonance goals after the paired legacy forge milestone', () => {
    const sect = createInitialState().sect
    sect.legacy.unlockedDungeons = ['guixuRift']
    sect.buildings = sect.buildings.map((building) =>
      building.type === 'forge' ? { ...building, unlocked: true, level: 8 } : building
    )
    sect.archiveMilestones = [
      { id: 'firstLegacyForge', unlockedAt: 1 },
      { id: 'legacyForgePair', unlockedAt: 2 },
    ]
    sect.vault = [{ item: makeMaterial('tide_1', '归墟潮晶', 'spirit'), quantity: 1 }]

    const goals = buildSectStageGoals(sect, [], DUNGEONS)
    const legacyGoal = goals.find((goal) => goal.id === 'legacy_forge_trinity_prepare')

    expect(legacyGoal).toBeDefined()
    expect(legacyGoal?.title).toContain('第三件')
    expect(legacyGoal?.detail).toContain('回响模板')
  })

  it('should ask for the third relic once pair resonance materials are ready', () => {
    const sect = createInitialState().sect
    sect.legacy.unlockedDungeons = ['guixuRift']
    sect.buildings = sect.buildings.map((building) =>
      building.type === 'forge' ? { ...building, unlocked: true, level: 8 } : building
    )
    sect.archiveMilestones = [
      { id: 'firstLegacyForge', unlockedAt: 1 },
      { id: 'legacyForgePair', unlockedAt: 2 },
    ]
    sect.vault = [
      { item: makeMaterial('tide_1', '归墟潮晶', 'spirit'), quantity: 3 },
      { item: makeMaterial('shard_1', '渊息残片', 'divine'), quantity: 2 },
    ]

    const goals = buildSectStageGoals(sect, [], DUNGEONS)
    const legacyGoal = goals.find((goal) => goal.id === 'legacy_forge_trinity_ready')

    expect(legacyGoal).toBeDefined()
    expect(legacyGoal?.link).toBe('/buildings')
    expect(legacyGoal?.progress).toContain('3/3')
  })

  it('should sustain the endgame loop after the trinity milestone', () => {
    const sect = createInitialState().sect
    sect.legacy.unlockedDungeons = ['guixuRift']
    sect.buildings = sect.buildings.map((building) =>
      building.type === 'forge' ? { ...building, unlocked: true, level: 8 } : building
    )
    sect.archiveMilestones = [
      { id: 'firstLegacyForge', unlockedAt: 1 },
      { id: 'legacyForgePair', unlockedAt: 2 },
      { id: 'legacyForgeTrinity', unlockedAt: 3 },
    ]

    const goals = buildSectStageGoals(sect, [], DUNGEONS)
    const legacyGoal = goals.find((goal) => goal.id === 'legacy_forge_trinity_sustain')

    expect(legacyGoal).toBeDefined()
    expect(legacyGoal?.title).toContain('三遗齐鸣')
  })
})
