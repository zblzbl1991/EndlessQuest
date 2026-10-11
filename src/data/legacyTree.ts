/**
 * 飞升树（设计稿 §7.3）：道韵的消费场所。
 *
 * 4 主干 × 若干节点，升级成本 baseCost × 2^level。所有效果通过
 * data/legacy.ts 的查询函数进入计算管线（CultivationEngine / tickSlice /
 * adventureStore），并有单测断言真实生效。
 */

export type LegacyBranch = 'cultivation' | 'resource' | 'combat' | 'dao'

export interface LegacyTreeNodeDef {
  id: string
  name: string
  branch: LegacyBranch
  description: string
  baseCost: number
  maxLevel: number
  /** Per-level cost growth factor; defaults to 2 (finite nodes). Infinite sink nodes use < 2. */
  costGrowth?: number
}

export const LEGACY_TREE: LegacyTreeNodeDef[] = [
  // ── 修炼之道 ──
  {
    id: 'daoxin',
    name: '道心通明',
    branch: 'cultivation',
    description: '全体弟子修为速率 ×2/级',
    baseCost: 10,
    maxLevel: 5,
  },
  // ── 资源之道 ──
  {
    id: 'stoneVein',
    name: '灵脉充盈',
    branch: 'resource',
    description: '灵石产量 ×3/级',
    baseCost: 15,
    maxLevel: 5,
  },
  {
    id: 'spiritWell',
    name: '灵泉涌动',
    branch: 'resource',
    description: '灵气产量 ×3/级',
    baseCost: 15,
    maxLevel: 5,
  },
  {
    id: 'temporalInsight',
    name: '时光洞悉',
    branch: 'resource',
    description: '离线收益上限 +24 小时/级',
    baseCost: 25,
    maxLevel: 3,
  },
  // ── 战斗之道 ──
  {
    id: 'battleAura',
    name: '战意凌霄',
    branch: 'combat',
    description: '全体弟子战斗属性 ×2/级',
    baseCost: 20,
    maxLevel: 5,
  },
  {
    id: 'fortuneCharm',
    name: '财气亨通',
    branch: 'combat',
    description: '秘境资源收益 ×2/级',
    baseCost: 20,
    maxLevel: 5,
  },
  {
    id: 'heartSteadfast',
    name: '道心坚定',
    branch: 'combat',
    description: '突破成功率 +5%/级',
    baseCost: 15,
    maxLevel: 4,
  },
  // ── 天机之道 ──
  {
    id: 'heavenPivot',
    name: '天机推演',
    branch: 'dao',
    description: '解锁自动飞升（可在自动化设置中配置条件）',
    baseCost: 50,
    maxLevel: 1,
  },
  // ── 天机之道·无限水槽（工单 01）：道韵在任意飞升次数下的常驻消费出口 ──
  {
    id: 'daoEssence',
    name: '道韵精粹',
    branch: 'dao',
    description: '全体弟子修为速率与资源产出 ×1.03/级，可无限精进',
    baseCost: 20,
    maxLevel: 9999,
    costGrowth: 1.18,
  },
]

export function getLegacyTreeNode(id: string): LegacyTreeNodeDef | undefined {
  return LEGACY_TREE.find((node) => node.id === id)
}

/** Cost of the NEXT level for a node at the given current level. */
export function getLegacyNodeUpgradeCost(id: string, currentLevel: number): number | null {
  const node = getLegacyTreeNode(id)
  if (!node || currentLevel >= node.maxLevel) return null
  return node.baseCost * (node.costGrowth ?? 2) ** currentLevel
}
