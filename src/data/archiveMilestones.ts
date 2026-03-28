export interface ArchiveMilestone {
  id: string
  name: string
  description: string
  icon?: string
}

export const ARCHIVE_MILESTONES: ArchiveMilestone[] = [
  {
    id: 'first_disciple',
    name: '招收首位弟子',
    description: '首次成功招募弟子加入宗门',
    icon: 'recruit',
  },
  {
    id: 'first_breakthrough',
    name: '首次境界突破',
    description: '弟子首次成功突破境界',
    icon: 'breakthrough',
  },
  {
    id: 'first_dungeon_clear',
    name: '首次通关秘境',
    description: '首次成功通关一处秘境',
    icon: 'adventure',
  },
  {
    id: 'first_rare_recruit',
    name: '首位稀有弟子',
    description: '首次招募到灵品及以上品质的弟子',
    icon: 'recruit',
  },
  {
    id: 'first_tribulation',
    name: '首次渡劫成功',
    description: '弟子首次成功渡过天劫',
    icon: 'breakthrough',
  },
  {
    id: 'first_boss_clear',
    name: '首次击败Boss',
    description: '首次在秘境中击败Boss',
    icon: 'adventure',
  },
  {
    id: 'sect_level_3',
    name: '宗门升至3级',
    description: '宗门等级达到3级',
  },
  {
    id: 'sect_level_5',
    name: '宗门升至5级',
    description: '宗门等级达到5级',
  },
]

export const ARCHIVE_MILESTONE_MAP: Record<string, ArchiveMilestone> = Object.fromEntries(
  ARCHIVE_MILESTONES.map((m) => [m.id, m]),
)
