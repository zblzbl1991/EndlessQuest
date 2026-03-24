import type { Technique } from '../types/skill'

export const TECHNIQUES: Technique[] = [
  // Mental (心法) - spirit power, comprehension bonuses
  { id: 'basic_meditation', name: '基础吐纳术', type: 'mental', tier: 1, statBonus: { spiritPower: 10, comprehension: 2 }, description: '最基础的修炼心法，缓慢增长灵力与悟性' },
  { id: 'spirit_gathering', name: '聚灵心法', type: 'mental', tier: 2, statBonus: { spiritPower: 30, comprehension: 5 }, description: '聚拢天地灵气，大幅提升灵力上限' },
  { id: 'void_insight', name: '虚空悟道经', type: 'mental', tier: 3, statBonus: { spiritPower: 60, comprehension: 10, fortune: 3 }, description: '参悟虚空，灵力与悟性同时精进' },
  { id: 'dao_heart_sutra', name: '道心通明诀', type: 'mental', tier: 4, statBonus: { spiritPower: 100, comprehension: 20, fortune: 5, spiritualRoot: 5 }, description: '顶级心法，道心通明无所不知' },
  // Body (体修) - HP, DEF, SPD bonuses
  { id: 'iron_body', name: '铁布衫', type: 'body', tier: 1, statBonus: { hp: 30, def: 3 }, description: '外门硬功，强化肉身' },
  { id: 'golden_body', name: '金钟罩', type: 'body', tier: 2, statBonus: { hp: 80, def: 8, spd: 2 }, description: '内功外放形成金钟护体' },
  { id: 'vajra_body', name: '金刚不坏体', type: 'body', tier: 3, statBonus: { hp: 150, def: 15, spd: 5 }, description: '金刚之身万法不侵' },
  // Spiritual (神识) - ATK, crit bonuses
  { id: 'spirit_sense', name: '灵识初探', type: 'spiritual', tier: 1, statBonus: { atk: 5, crit: 0.02 }, description: '开启灵识感知灵力波动' },
  { id: 'mind_piercing', name: '穿心灵识', type: 'spiritual', tier: 2, statBonus: { atk: 12, crit: 0.05, critDmg: 0.1 }, description: '灵识穿透敌人防御' },
  { id: 'heavenly_eye', name: '天眼通', type: 'spiritual', tier: 3, statBonus: { atk: 25, crit: 0.1, critDmg: 0.2 }, description: '天眼洞察万物弱点' },
]

export function getTechniqueById(id: string): Technique | undefined {
  return TECHNIQUES.find(t => t.id === id)
}
