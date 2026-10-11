/**
 * 本源树（V2.1 工单 09，设计稿 §7.4 / §2 四层循环）：大道本源的消费场所。
 *
 * 4 干 × 3 节点，成本 base × 2^level（与飞升树同构）。所有效果通过查询函数
 * 进入计算管线（tickSlice / performAscension / GenesisSystem），并有单测断言。
 * 证道是大循环终点：仙界封顶 1e100，"深度"维度不存在，本源树的职责是
 * **时间压缩与全局倍率**——每轮证道买树，下一轮大循环整体更快更强。
 */

export type GenesisBranch = 'dao' | 'samsara' | 'creation' | 'heaven'

export interface GenesisTreeNodeDef {
  id: string
  name: string
  branch: GenesisBranch
  description: string
  baseCost: number
  maxLevel: number
}

export const GENESIS_TREE: GenesisTreeNodeDef[] = [
  // ── 大道之干：全局修为与资源产出（跨证道复利主力）──
  {
    id: 'daoBody',
    name: '大道筑基',
    branch: 'dao',
    description: '全体弟子修为速率 ×2/级',
    baseCost: 5,
    maxLevel: 5,
  },
  {
    id: 'daoFlow',
    name: '大道流转',
    branch: 'dao',
    description: '灵石 / 灵草 / 矿材 / 灵气产出 ×2/级',
    baseCost: 8,
    maxLevel: 5,
  },
  {
    id: 'daoEssenceSea',
    name: '本源之海',
    branch: 'dao',
    description: '道韵获取 ×2/级',
    baseCost: 5,
    maxLevel: 5,
  },
  // ── 轮回之干：大循环时间压缩 ──
  {
    id: 'samsaraMortal',
    name: '凡尘逆旅',
    branch: 'samsara',
    description: '凡界段（炼气~渡劫）修炼速率额外 ×2/级',
    baseCost: 3,
    maxLevel: 4,
  },
  {
    id: 'samsaraImmortal',
    name: '仙路加速',
    branch: 'samsara',
    description: '仙界段（真仙~道祖）修炼速率额外 ×2/级',
    baseCost: 10,
    maxLevel: 4,
  },
  {
    id: 'samsaraBreakthrough',
    name: '劫波不侵',
    branch: 'samsara',
    description: '突破成功率 +5%/级',
    baseCost: 8,
    maxLevel: 3,
  },
  // ── 造化之干：开局福利 ──
  {
    id: 'creationWealth',
    name: '造化灵蕴',
    branch: 'creation',
    description: '飞升开局灵石 ×10/级',
    baseCost: 4,
    maxLevel: 3,
  },
  {
    id: 'creationDisciples',
    name: '广纳英才',
    branch: 'creation',
    description: '飞升时额外保留 1 名弟子/级（境界最高者优先）',
    baseCost: 9,
    maxLevel: 3,
  },
  {
    id: 'creationDaoYun',
    name: '道韵凝丹',
    branch: 'creation',
    description: '飞升开局道韵 +10/级',
    baseCost: 7,
    maxLevel: 3,
  },
  // ── 天机之干：便利与终局 ──
  {
    id: 'heavenOffline',
    name: '洞天藏息',
    branch: 'heaven',
    description: '离线收益上限 +24 小时/级',
    baseCost: 6,
    maxLevel: 3,
  },
  {
    id: 'heavenAutoProve',
    name: '天机证道',
    branch: 'heaven',
    description: '解锁自动证道（可配置条件）',
    baseCost: 15,
    maxLevel: 1,
  },
  {
    id: 'heavenTranscend',
    name: '超脱之门',
    branch: 'heaven',
    description: '本源树累计 30 级且达道祖后可超脱（终局）',
    baseCost: 40,
    maxLevel: 1,
  },
]

export function getGenesisTreeNode(id: string): GenesisTreeNodeDef | undefined {
  return GENESIS_TREE.find((node) => node.id === id)
}

/** Cost of the NEXT level for a node at the given current level. */
export function getGenesisNodeUpgradeCost(id: string, currentLevel: number): number | null {
  const node = getGenesisTreeNode(id)
  if (!node || currentLevel >= node.maxLevel) return null
  return node.baseCost * 2 ** currentLevel
}

function treeLevel(tree: Record<string, number> | undefined, nodeId: string): number {
  return tree?.[nodeId] ?? 0
}

// ─── 效果查询（全部接入计算管线并断言） ──────────────────────────────

/** 大道筑基：全体修为速率 ×2/级。 */
export function getGenesisCultivationMult(tree?: Record<string, number>): number {
  return 2 ** treeLevel(tree, 'daoBody')
}

/** 大道流转：四资源产出 ×2/级。 */
export function getGenesisResourceMult(tree?: Record<string, number>): number {
  return 2 ** treeLevel(tree, 'daoFlow')
}

/** 本源之海：道韵获取 ×2/级。 */
export function getGenesisDaoYunMult(tree?: Record<string, number>): number {
  return 2 ** treeLevel(tree, 'daoEssenceSea')
}

/** 凡尘逆旅：凡界段（realm < 9）修炼额外 ×2/级。 */
export function getGenesisMortalSpeedMult(tree?: Record<string, number>): number {
  return 2 ** treeLevel(tree, 'samsaraMortal')
}

/** 仙路加速：仙界段（realm ≥ 9）修炼额外 ×2/级。 */
export function getGenesisImmortalSpeedMult(tree?: Record<string, number>): number {
  return 2 ** treeLevel(tree, 'samsaraImmortal')
}

/** 劫波不侵：突破成功率 +5%/级。 */
export function getGenesisBreakthroughBonus(tree?: Record<string, number>): number {
  return 0.05 * treeLevel(tree, 'samsaraBreakthrough')
}

/** 造化灵蕴：飞升开局灵石 ×10/级。 */
export function getGenesisStartingStoneMult(tree?: Record<string, number>): number {
  return 10 ** treeLevel(tree, 'creationWealth')
}

/** 广纳英才：飞升额外保留弟子数。 */
export function getGenesisExtraGuardians(tree?: Record<string, number>): number {
  return treeLevel(tree, 'creationDisciples')
}

/** 道韵凝丹：飞升开局道韵 +10/级。 */
export function getGenesisStartingDaoYun(tree?: Record<string, number>): number {
  return 10 * treeLevel(tree, 'creationDaoYun')
}

/** 洞天藏息：离线收益上限 +24h/级。 */
export function getGenesisOfflineBonusHours(tree?: Record<string, number>): number {
  return 24 * treeLevel(tree, 'heavenOffline')
}

/** 天机证道：自动证道解锁。 */
export function isAutoProveDaoUnlocked(tree?: Record<string, number>): boolean {
  return treeLevel(tree, 'heavenAutoProve') > 0
}

/** 超脱之门：节点已购买。 */
export function isTranscendGateOpen(tree?: Record<string, number>): boolean {
  return treeLevel(tree, 'heavenTranscend') > 0
}

/** 本源树累计等级（超脱条件之一）。 */
export function getGenesisTreeTotalLevel(tree?: Record<string, number>): number {
  if (!tree) return 0
  return Object.values(tree).reduce((sum, level) => sum + level, 0)
}
