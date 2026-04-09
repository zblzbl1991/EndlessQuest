import type { ArchiveMilestoneEntry, ArchiveMilestoneId } from '../types/sect'

export interface ArchiveMilestoneDef {
  id: ArchiveMilestoneId
  title: string
  description: string
  icon?: string
}

export const ARCHIVE_MILESTONES: Record<ArchiveMilestoneId, ArchiveMilestoneDef> = {
  // --- 弟子类 ---
  firstRareRecruit: {
    id: 'firstRareRecruit',
    title: '初见异才',
    description: '首次招募到灵品或以上的弟子。',
  },
  firstEpicRecruit: {
    id: 'firstEpicRecruit',
    title: '天纵之资',
    description: '首次招募到绝品弟子。',
  },
  firstLegendaryRecruit: {
    id: 'firstLegendaryRecruit',
    title: '旷世奇才',
    description: '首次招募到神品弟子。',
  },
  discipleCount5: {
    id: 'discipleCount5',
    title: '桃李初成',
    description: '宗门弟子达到五人。',
  },
  // --- 境界类 ---
  firstTribulationSuccess: {
    id: 'firstTribulationSuccess',
    title: '雷火证道',
    description: '首次成功渡过天劫。',
  },
  firstFoundationBreakthrough: {
    id: 'firstFoundationBreakthrough',
    title: '筑基立根',
    description: '首次有弟子突破至筑基期。',
  },
  firstGoldenCoreBreakthrough: {
    id: 'firstGoldenCoreBreakthrough',
    title: '金丹大成',
    description: '首次有弟子突破至金丹期。',
  },
  firstNascentSoulBreakthrough: {
    id: 'firstNascentSoulBreakthrough',
    title: '元婴出窍',
    description: '首次有弟子突破至元婴期。',
  },
  // --- 秘境类 ---
  firstDungeonClear: {
    id: 'firstDungeonClear',
    title: '秘境留名',
    description: '首次完整通关一处秘境。',
  },
  firstDungeonLevel10: {
    id: 'firstDungeonLevel10',
    title: '深入险地',
    description: '首次通关秘境第十层。',
  },
  adventureRuns10: {
    id: 'adventureRuns10',
    title: '身经百战',
    description: '累计完成十次秘境探索。',
  },
  // --- 功法/特殊 ---
  firstTechniqueUnlock: {
    id: 'firstTechniqueUnlock',
    title: '初悟道法',
    description: '首次参悟一部新功法。',
  },
  firstPetCapture: {
    id: 'firstPetCapture',
    title: '驯灵初成',
    description: '首次成功捕获灵宠。',
  },
  firstItemCraft: {
    id: 'firstItemCraft',
    title: '淬火初成',
    description: '首次炼器成功。',
  },
  sectLevel5: {
    id: 'sectLevel5',
    title: '宗门兴盛',
    description: '宗门等级达到五级。',
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
