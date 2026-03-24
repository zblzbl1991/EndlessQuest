import type { ActiveSkill } from '../types/skill'

export const ACTIVE_SKILLS: ActiveSkill[] = [
  // Attack skills
  { id: 'sword_qi', name: '剑气纵横', category: 'attack', element: 'lightning', multiplier: 1.5, spiritCost: 10, cooldown: 0, description: '凝聚剑气横扫四方', tier: 1 },
  { id: 'fire_palm', name: '烈焰掌', category: 'attack', element: 'fire', multiplier: 1.8, spiritCost: 15, cooldown: 1, description: '掌心烈火灼烧敌人', tier: 2 },
  { id: 'ice_blade', name: '寒冰剑诀', category: 'attack', element: 'ice', multiplier: 2.2, spiritCost: 20, cooldown: 2, description: '寒气凝剑冰封万物', tier: 3 },
  { id: 'thunder_strike', name: '雷霆万钧', category: 'attack', element: 'lightning', multiplier: 2.8, spiritCost: 25, cooldown: 3, description: '引天雷之力轰击', tier: 4 },
  { id: 'heal_art', name: '回春术', category: 'support', element: 'healing', multiplier: 0, spiritCost: 15, cooldown: 2, description: '恢复自身30%最大生命', tier: 2 },
  { id: 'ice_shield', name: '冰甲术', category: 'defense', element: 'ice', multiplier: 0, spiritCost: 12, cooldown: 3, description: '减少受到伤害30%持续2回合', tier: 2 },
  // Ultimate skills
  { id: 'dao_sword', name: '万剑归宗', category: 'ultimate', element: 'lightning', multiplier: 4.0, spiritCost: 40, cooldown: 5, description: '万剑齐发毁天灭地', tier: 5 },
  { id: 'phoenix_strike', name: '凤凰涅槃', category: 'ultimate', element: 'fire', multiplier: 3.5, spiritCost: 35, cooldown: 4, description: '浴火重生焚尽一切', tier: 4 },
]

export function getActiveSkillById(id: string): ActiveSkill | undefined {
  return ACTIVE_SKILLS.find(s => s.id === id)
}
