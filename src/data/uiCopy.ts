import type { AdventureReportResult, TacticalPreset } from '../types/adventure'

export const TACTICAL_PRESET_LABELS: Record<TacticalPreset, string> = {
  conservative: '守势',
  balanced: '平衡',
  burst: '爆发',
  bossCounter: '破首',
}

export const TACTICAL_PRESET_DESCRIPTIONS: Record<TacticalPreset, string> = {
  balanced: '稳扎稳打，适合大多数秘境。',
  conservative: '优先保命，适合试探新秘境。',
  burst: '追求更快击杀，适合速推。',
  bossCounter: '保留火力应对首领层。',
}

export const REPORT_RESULT_LABELS: Record<AdventureReportResult, string> = {
  completed: '通关',
  retreated: '撤退',
  failed: '失利',
}

export const ROUTE_DIRECTION_LABELS = {
  stable: '稳定',
  combat: '战斗',
  profit: '收益',
  mutation: '异变',
} as const

export function getTacticalPresetLabel(preset: TacticalPreset): string {
  return TACTICAL_PRESET_LABELS[preset]
}

export function getRouteDirectionLabel(direction: keyof typeof ROUTE_DIRECTION_LABELS): string {
  return ROUTE_DIRECTION_LABELS[direction]
}
