import { describe, expect, it } from 'vitest'
import { getArchiveMilestoneDef, unlockArchiveMilestone } from '../data/archiveMilestones'

describe('archive milestones', () => {
  it('should return milestone metadata by id', () => {
    const milestone = getArchiveMilestoneDef('firstDungeonClear')
    expect(milestone?.title).toBeTruthy()
  })

  it('should unlock a milestone only once', () => {
    const first = unlockArchiveMilestone([], 'firstDungeonClear', 123)
    const second = unlockArchiveMilestone(first, 'firstDungeonClear', 456)

    expect(first).toHaveLength(1)
    expect(second).toHaveLength(1)
    expect(second[0].unlockedAt).toBe(123)
  })
})
