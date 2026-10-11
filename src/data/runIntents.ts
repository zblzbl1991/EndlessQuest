import type { AutomationStrategy } from '../types/adventure'

export interface RunIntentDef {
  id: AutomationStrategy
  label: string
  shortDescription: string
}

export const RUN_INTENTS: Record<AutomationStrategy, RunIntentDef> = {
  steady: {
    id: 'steady',
    label: '守成',
    shortDescription: '稳妥归来，少冒风险。',
  },
  combat: {
    id: 'combat',
    label: '争锋',
    shortDescription: '优先冲层，追求战斗成型。',
  },
  profit: {
    id: 'profit',
    label: '寻机',
    shortDescription: '优先机缘、功法与成长收获。',
  },
  seekDao: {
    id: 'seekDao',
    label: '求道',
    shortDescription: '只走奇遇路线刷祝福与功法，构筑优先。',
  },
}

export function getRunIntentDef(strategy: AutomationStrategy): RunIntentDef {
  return RUN_INTENTS[strategy]
}
