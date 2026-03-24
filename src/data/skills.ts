import type { TechniqueType } from '../types/skill'

export const TECHNIQUE_TYPE_NAMES: Record<TechniqueType, string> = {
  mental: '心法', body: '体修', spiritual: '神识',
}

export const TECHNIQUE_TIER_NAMES = ['初级', '中级', '高级', '顶级']

export const ELEMENT_NAMES: Record<string, string> = {
  fire: '火', ice: '冰', lightning: '雷', healing: '治愈',
}

export const COUNTER_MAP: Record<string, string> = {
  fire: 'ice', ice: 'lightning', lightning: 'fire', healing: 'neutral',
}

export function getElementMultiplier(attackerElement: string, defenderElement: string): number {
  if (attackerElement === 'healing' || defenderElement === 'healing') return 1.0
  if (COUNTER_MAP[attackerElement] === defenderElement) return 1.5
  if (COUNTER_MAP[defenderElement] === attackerElement) return 0.75
  return 1.0
}
