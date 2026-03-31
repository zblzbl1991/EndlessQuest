import type { ArchiveMilestoneEntry, ArchiveMilestoneId } from '../types/sect'

export interface ArchiveMilestoneDef {
  id: ArchiveMilestoneId
  title: string
  description: string
  icon?: string
}

export const ARCHIVE_MILESTONES: Record<ArchiveMilestoneId, ArchiveMilestoneDef> = {
  firstRareRecruit: {
    id: 'firstRareRecruit',
    title: '初见异才',
    description: '首次招募到灵品或以上的弟子。',
  },
  firstTribulationSuccess: {
    id: 'firstTribulationSuccess',
    title: '雷火证道',
    description: '首次成功渡过天劫。',
  },
  firstDungeonClear: {
    id: 'firstDungeonClear',
    title: '秘境留名',
    description: '首次完整通关一处秘境。',
  },
}

export function getArchiveMilestoneDef(id: ArchiveMilestoneId): ArchiveMilestoneDef {
  return ARCHIVE_MILESTONES[id]
}

export function unlockArchiveMilestone(
  milestones: ArchiveMilestoneEntry[],
  id: ArchiveMilestoneId,
  unlockedAt = Date.now()
): ArchiveMilestoneEntry[] {
  return milestones.some((milestone) => milestone.id === id) ? milestones : [...milestones, { id, unlockedAt }]
}
