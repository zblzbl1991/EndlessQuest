import type { BlessingId } from '../types/adventure'

export interface BlessingDef {
  id: BlessingId
  name: string
  description: string
}

export interface Blessing {
  id: string
  name: string
  description: string
  effectType: 'atkBoost' | 'critBoost' | 'spiritRegen' | 'hpBoost' | 'defBoost' | 'healOnKill' | 'lootBonus'
}

export const BLESSING_DEFS: Record<BlessingId, BlessingDef> = {
  stoneHarvest: {
    id: 'stoneHarvest',
    name: '采石灵佑',
    description: '后续秘境中的灵石奖励提高 30%。',
  },
  verdantBounty: {
    id: 'verdantBounty',
    name: '木灵丰赐',
    description: '后续秘境中的灵草奖励提高 30%。',
  },
  ironBody: {
    id: 'ironBody',
    name: '铁骨生机',
    description: '每通过一层后，全队恢复 12% 最大生命。',
  },
  galeStride: {
    id: 'galeStride',
    name: '疾风步',
    description: '战斗中速度提高 15%。',
  },
  battleFocus: {
    id: 'battleFocus',
    name: '战意凝神',
    description: '战斗中攻击提高 15%。',
  },
}

export const BLESSINGS: Blessing[] = [
  { id: 'flame_heart', name: '炎心', description: '提高攻击力。', effectType: 'atkBoost' },
  { id: 'iron_wall', name: '铁壁', description: '提高防御力。', effectType: 'defBoost' },
  { id: 'jade_pulse', name: '玉脉', description: '提高生命值。', effectType: 'hpBoost' },
  { id: 'spirit_spring', name: '灵泉', description: '恢复灵力。', effectType: 'spiritRegen' },
  { id: 'keen_eye', name: '锐目', description: '提高暴击。', effectType: 'critBoost' },
  { id: 'reaper_mark', name: '猎杀号令', description: '击杀后恢复。', effectType: 'healOnKill' },
  { id: 'golden_touch', name: '聚宝', description: '增加掉落。', effectType: 'lootBonus' },
  { id: 'wind_step', name: '踏风', description: '进一步强化输出。', effectType: 'atkBoost' },
]
