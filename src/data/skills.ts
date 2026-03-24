export const TECHNIQUE_TYPE_NAMES: Record<string, string> = {
  mental: '心法', body: '体修', spiritual: '神识',
}

export const TECHNIQUE_TIER_NAMES = ['初级', '中级', '高级', '顶级']

export const ELEMENT_NAMES: Record<string, string> = {
  fire: '火',
  ice: '冰',
  lightning: '雷',
  healing: '治愈',
  neutral: '无属性',
}

/**
 * Element counter relationships.
 * neutral has NO counter relationships — it is not included in this map.
 * Key = element, Value = the element it is strong against.
 */
export const COUNTER_MAP: Record<string, string> = {
  fire: 'ice',
  ice: 'lightning',
  lightning: 'fire',
}

/**
 * Get the damage multiplier based on element interaction.
 * - Counter: 1.5x (attacker's counter target is defender's element)
 * - Weakness: 0.75x (defender's counter target is attacker's element)
 * - Neutral vs any (or any vs neutral): 1.0x (no counter, no weakness)
 * - Same element: 1.0x
 * - Healing: 1.0x (no combat interaction)
 */
export function getElementMultiplier(attackerElement: string, defenderElement: string): number {
  // Healing has no element interaction
  if (attackerElement === 'healing' || defenderElement === 'healing') return 1.0
  // Neutral has no counter relationships in either direction
  if (attackerElement === 'neutral' || defenderElement === 'neutral') return 1.0
  // Counter: attacker strong against defender
  if (COUNTER_MAP[attackerElement] === defenderElement) return 1.5
  // Weakness: defender strong against attacker
  if (COUNTER_MAP[defenderElement] === attackerElement) return 0.75
  // Same element or no relationship
  return 1.0
}
