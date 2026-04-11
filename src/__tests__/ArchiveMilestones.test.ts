import { describe, expect, it } from 'vitest'
import { getArchiveMilestoneDef, unlockArchiveMilestone } from '../data/archiveMilestones'

describe('archive milestones', () => {
  it('should return milestone metadata by id', () => {
    const milestone = getArchiveMilestoneDef('firstDungeonClear')
    expect(milestone?.title).toBeTruthy()
  })

  it('should expose the guixu rift first-clear milestone metadata', () => {
    const milestone = getArchiveMilestoneDef('guixuRiftFirstClear')
    expect(milestone.title).toContain('归墟')
  })

  it('should expose the first legacy forge milestone metadata', () => {
    const milestone = getArchiveMilestoneDef('firstLegacyForge')
    expect(milestone.title).toContain('遗器')
  })

  it('should expose the paired legacy forge milestone metadata', () => {
    const milestone = getArchiveMilestoneDef('legacyForgePair')
    expect(milestone.title).toContain('共鸣')
  })

  it('should expose the trinity legacy forge milestone metadata', () => {
    const milestone = getArchiveMilestoneDef('legacyForgeTrinity')
    expect(milestone.title).toContain('三遗')
  })

  it('should unlock a milestone only once', () => {
    const first = unlockArchiveMilestone([], 'firstDungeonClear', 123)
    const second = unlockArchiveMilestone(first, 'firstDungeonClear', 456)

    expect(first).toHaveLength(1)
    expect(second).toHaveLength(1)
    expect(second[0].unlockedAt).toBe(123)
  })
})
