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
  firstTechniqueUnlock: {
    id: 'firstTechniqueUnlock',
    title: '初悟道法',
    description: '首次参悟一部新功法。',
  },
  firstPetCapture: {
    id: 'firstPetCapture',
    title: '驭灵初成',
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
  guixuRiftFirstClear: {
    id: 'guixuRiftFirstClear',
    title: '归墟留痕',
    description: '首次通关轮回秘境「归墟裂隙」，将遗产残卷带回山门。',
  },
  firstLegacyForge: {
    id: 'firstLegacyForge',
    title: '遗器初成',
    description: '首次以归墟遗材铸成遗产装备，宗门正式拥有轮回遗器。',
  },
  legacyForgePair: {
    id: 'legacyForgePair',
    title: '双遗共鸣',
    description: '归墟道兵与镇渊遗符同时成型，归墟裂隙对宗门的回应进一步加深。',
  },
  legacyForgeTrinity: {
    id: 'legacyForgeTrinity',
    title: '三遗齐鸣',
    description: '双遗共鸣后再铸一件归墟遗器，让归墟回响正式转入宗门的终盘循环。',
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
