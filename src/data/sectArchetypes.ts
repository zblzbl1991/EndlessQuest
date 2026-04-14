import type { SectArchetype, BuildingType, ExpeditionRewardFocus } from '../types/sect'

export interface SectArchetypeDescriptor {
  id: SectArchetype
  name: string
  summary: string
  strengths: string[]
  weaknesses: string[]
  focusBuildings: BuildingType[]
  focusRewardTypes: ExpeditionRewardFocus[]
}

export const SECT_ARCHETYPES: SectArchetypeDescriptor[] = [
  {
    id: 'swordBurst',
    name: '剑走偏锋',
    summary: '以攻代守，集中资源在战斗突破和远征推进上。',
    strengths: ['远征推进速度 +20%', '战斗突破收益 +15%'],
    weaknesses: ['恢复效率 -10%'],
    focusBuildings: ['forge', 'scriptureHall'],
    focusRewardTypes: ['progress', 'materials'],
  },
  {
    id: 'pillSustain',
    name: '丹道固本',
    summary: '以丹药和恢复为核心，保证弟子持续修炼不中断。',
    strengths: ['闭关收益 +20%', '恢复速度 +25%'],
    weaknesses: ['远征推进速度 -10%'],
    focusBuildings: ['alchemyFurnace', 'spiritField'],
    focusRewardTypes: ['resources', 'techniques'],
  },
  {
    id: 'arrayGuard',
    name: '阵法守正',
    summary: '均衡发展，靠建筑协同和资源调度稳步前进。',
    strengths: ['建筑协同收益 +15%', '资源产出 +10%'],
    weaknesses: ['缺乏爆发性收益窗口'],
    focusBuildings: ['mainHall', 'market'],
    focusRewardTypes: ['resources', 'pets'],
  },
  {
    id: 'beastHarvest',
    name: '御兽拓荒',
    summary: '偏重灵宠和探索收益，善于从秘境中获取稀有资源。',
    strengths: ['灵宠捕获率 +20%', '秘境稀有掉落 +15%'],
    weaknesses: ['基础资源产出 -10%'],
    focusBuildings: ['recruitmentPavilion', 'spiritMine'],
    focusRewardTypes: ['pets', 'techniques'],
  },
]

const ARCHETYPE_MAP = new Map(SECT_ARCHETYPES.map((a) => [a.id, a]))

export function getArchetypeDescriptor(id: SectArchetype): SectArchetypeDescriptor {
  return ARCHETYPE_MAP.get(id) ?? SECT_ARCHETYPES[1] // default: pillSustain
}

export const ARCHETYPE_NAMES: Record<SectArchetype, string> = Object.fromEntries(
  SECT_ARCHETYPES.map((a) => [a.id, a.name])
) as Record<SectArchetype, string>

export function getArchetypeName(archetype: SectArchetype): string {
  return ARCHETYPE_NAMES[archetype] ?? '丹鼎长明'
}
