/**
 * Tactic presets control how the AI selects skills and targets during combat.
 * Each preset modifies skill selection order and target priority.
 */
export type TacticPreset = 'balanced' | 'conserve' | 'burst' | 'boss'

export const TACTIC_PRESET_LABELS: Record<TacticPreset, string> = {
  balanced: '均衡',
  conserve: '省灵',
  burst: '爆发',
  boss: '首领',
}

export const TACTIC_PRESET_DESCRIPTIONS: Record<TacticPreset, string> = {
  balanced: '均衡使用技能与普攻',
  conserve: '节省灵力，优先使用低耗技能',
  burst: '全力输出，尽早释放高伤技能',
  boss: '集火首领，优先使用单体技能',
}
