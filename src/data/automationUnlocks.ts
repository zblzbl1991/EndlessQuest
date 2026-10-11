/**
 * 自动化解锁表（V2 设计稿 §八 / V2.1 map 工单 05）。
 *
 * 原则：前期手动做的事情，后期全部自动化；自动化本身是长线奖励而非理所当然。
 * 解锁条件三类：境界（bestRealm ≥ realmIndex）、建筑 Milestone 能力（isCapabilityUnlocked）、
 * 飞升树节点（treeLevel > 0）。
 */
import type { BuildingCapability } from './buildings'
import type { Sect } from '../types/sect'
import { isCapabilityUnlocked } from './buildings'

export type AutomationGroup = 'cultivation' | 'production' | 'expedition' | 'ascension'

export type AutomationUnlock =
  | { kind: 'realm'; realmIndex: number }
  | { kind: 'capability'; capability: BuildingCapability }
  | { kind: 'legacyNode'; nodeId: string }

export interface AutomationItemDef {
  key: string
  name: string
  group: AutomationGroup
  description: string
  unlock: AutomationUnlock
  /** 无独立开关的自动化（资源保底/常驻逻辑）为 true；其余由 automationSettings 控制。 */
  alwaysOn: boolean
  /** 面板展示用解锁条件文案 */
  unlockHint: string
}

export const AUTOMATION_ITEMS: AutomationItemDef[] = [
  {
    key: 'autoEquip',
    name: '装备自动最优',
    group: 'expedition',
    description: '弟子出战前自动穿戴仓库中最优装备',
    unlock: { kind: 'realm', realmIndex: 1 },
    alwaysOn: true,
    unlockHint: '筑基期解锁',
  },
  {
    key: 'autoExpedition',
    name: '自动秘境托管',
    group: 'expedition',
    description: '远征按模板与策略意图自动推进，无需逐层手操',
    unlock: { kind: 'realm', realmIndex: 1 },
    alwaysOn: true,
    unlockHint: '筑基期解锁',
  },
  {
    key: 'autoRecruit',
    name: '自动招募',
    group: 'production',
    description: '资源超过保底线时自动补员（上限受灵气供给约束）',
    unlock: { kind: 'realm', realmIndex: 3 },
    alwaysOn: true,
    unlockHint: '元婴期解锁',
  },
  {
    key: 'autoMinorBreakthrough',
    name: '小境界自动突破',
    group: 'cultivation',
    description: '弟子修为圆满时自动冲击下一小境界（消耗资源自动结算）',
    unlock: { kind: 'realm', realmIndex: 3 },
    alwaysOn: false,
    unlockHint: '元婴期解锁',
  },
  {
    key: 'autoMajorBreakthrough',
    name: '大境界自动突破',
    group: 'cultivation',
    description: '大境界圆满时自动渡劫突破（失败风险照常结算）',
    unlock: { kind: 'realm', realmIndex: 4 },
    alwaysOn: false,
    unlockHint: '化神期解锁',
  },
  {
    key: 'autoSellJunk',
    name: '自动出售凡品',
    group: 'production',
    description: '仓库接近满位时自动出售凡品装备换灵石',
    unlock: { kind: 'capability', capability: 'autoSellJunk' },
    alwaysOn: true,
    unlockHint: '灵矿 Lv25 里程碑解锁',
  },
  {
    key: 'autoAlchemy',
    name: '自动炼丹续产',
    group: 'production',
    description: '丹炉队列空闲时自动续产上一配方',
    unlock: { kind: 'capability', capability: 'autoAlchemy' },
    alwaysOn: true,
    unlockHint: '灵田 Lv25 里程碑解锁',
  },
  {
    key: 'autoAscend',
    name: '自动飞升',
    group: 'ascension',
    description: '满足条件（境界 + 预期道韵 ≥ 门槛）时自动飞升',
    unlock: { kind: 'legacyNode', nodeId: 'heavenPivot' },
    alwaysOn: false,
    unlockHint: '飞升树"天机推演"节点 + 大乘期解锁',
  },
]

export function isAutomationUnlocked(sect: Sect, key: string): boolean {
  const item = AUTOMATION_ITEMS.find((i) => i.key === key)
  if (!item) return false
  switch (item.unlock.kind) {
    case 'realm': {
      const bestRealm = sect.characters.reduce((max, c) => Math.max(max, c.realm), 0)
      return bestRealm >= item.unlock.realmIndex
    }
    case 'capability':
      return isCapabilityUnlocked(sect.buildings, item.unlock.capability)
    case 'legacyNode':
      return (sect.legacyTree?.[item.unlock.nodeId] ?? 0) > 0
  }
}

/** 面板三态：locked（未解锁，展示条件）/ available（已解锁未开启）/ on（生效中）。 */
export function getAutomationState(sect: Sect, key: string): 'locked' | 'available' | 'on' {
  const item = AUTOMATION_ITEMS.find((i) => i.key === key)
  if (!item || !isAutomationUnlocked(sect, key)) return 'locked'
  if (item.alwaysOn) return 'on'
  switch (key) {
    case 'autoMinorBreakthrough':
      return sect.automationSettings.autoBreakthrough ? 'on' : 'available'
    case 'autoMajorBreakthrough':
      return sect.automationSettings.autoMajorBreakthrough ? 'on' : 'available'
    case 'autoAscend':
      return sect.automationSettings.autoAscend ? 'on' : 'available'
    default:
      return 'available'
  }
}

/** 某境界新达成的自动化（境界突破时刻的解锁反馈）。 */
export function getAutomationsUnlockedAtRealm(realmIndex: number): AutomationItemDef[] {
  return AUTOMATION_ITEMS.filter((i) => i.unlock.kind === 'realm' && i.unlock.realmIndex === realmIndex)
}
