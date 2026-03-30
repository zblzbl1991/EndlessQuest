import type { SectPath } from '../types/sect'

export interface PathEffect {
  type: string // e.g. 'atk', 'herbYield', 'petPower'
  value: number // multiplier or flat bonus
}

export interface SectPathNode {
  id: string
  name: string
  description: string
  path: SectPath
  order: number // unlock order (1-5)
  cost: { spiritStone: number; herb?: number; ore?: number }
  effects: PathEffect[]
}

export interface SectPathDef {
  id: SectPath
  name: string
  description: string
  unlockCondition: { sectLevel: number; discipleCount: number }
  resetCost: number // spirit stone cost to switch paths
  nodes: SectPathNode[]
}

export const SECT_PATHS: Record<Exclude<SectPath, 'none'>, SectPathDef> = {
  pill: {
    id: 'pill',
    name: '丹道宗门',
    description: '灵草产出 +50%，炼丹成功率 +15%',
    unlockCondition: { sectLevel: 5, discipleCount: 10 },
    resetCost: 500000,
    nodes: [
      {
        id: 'pill_1',
        name: '灵田改良',
        description: '灵草产出 +20%',
        path: 'pill',
        order: 1,
        cost: { spiritStone: 50000, herb: 5000 },
        effects: [{ type: 'herbYield', value: 1.2 }],
      },
      {
        id: 'pill_2',
        name: '丹道真传',
        description: '炼丹暴击率 +10%',
        path: 'pill',
        order: 2,
        cost: { spiritStone: 100000, herb: 10000 },
        effects: [{ type: 'alchemyCrit', value: 0.1 }],
      },
      {
        id: 'pill_3',
        name: '百草纲目',
        description: '解锁丹方 +3',
        path: 'pill',
        order: 3,
        cost: { spiritStone: 200000, herb: 20000 },
        effects: [{ type: 'recipeSlots', value: 3 }],
      },
      {
        id: 'pill_4',
        name: '炼丹大师',
        description: '双倍产出概率 15%',
        path: 'pill',
        order: 4,
        cost: { spiritStone: 500000, herb: 50000 },
        effects: [{ type: 'doubleCraft', value: 0.15 }],
      },
      {
        id: 'pill_5',
        name: '太上丹经',
        description: '突破消耗灵石 -20%',
        path: 'pill',
        order: 5,
        cost: { spiritStone: 1000000, herb: 100000 },
        effects: [{ type: 'breakthroughCost', value: 0.8 }],
      },
    ],
  },
  sword: {
    id: 'sword',
    name: '剑道宗门',
    description: '战斗伤害 +20%，暴击率 +10%',
    unlockCondition: { sectLevel: 5, discipleCount: 10 },
    resetCost: 500000,
    nodes: [
      {
        id: 'sword_1',
        name: '剑气纵横',
        description: '攻击 +10%',
        path: 'sword',
        order: 1,
        cost: { spiritStone: 50000, ore: 5000 },
        effects: [{ type: 'atk', value: 1.1 }],
      },
      {
        id: 'sword_2',
        name: '剑意凝形',
        description: '暴击 +5%',
        path: 'sword',
        order: 2,
        cost: { spiritStone: 100000, ore: 10000 },
        effects: [{ type: 'crit', value: 1.05 }],
      },
      {
        id: 'sword_3',
        name: '万剑归宗',
        description: '群体伤害 +15%',
        path: 'sword',
        order: 3,
        cost: { spiritStone: 200000, ore: 20000 },
        effects: [{ type: 'aoeDmg', value: 1.15 }],
      },
      {
        id: 'sword_4',
        name: '剑心通明',
        description: '速度 +15%',
        path: 'sword',
        order: 4,
        cost: { spiritStone: 500000, ore: 50000 },
        effects: [{ type: 'spd', value: 1.15 }],
      },
      {
        id: 'sword_5',
        name: '剑道极致',
        description: 'Boss 伤害 +30%',
        path: 'sword',
        order: 5,
        cost: { spiritStone: 1000000, ore: 100000 },
        effects: [{ type: 'bossDmg', value: 1.3 }],
      },
    ],
  },
  beast: {
    id: 'beast',
    name: '御兽宗门',
    description: '宠物属性 +40%，捕获率 +25%',
    unlockCondition: { sectLevel: 5, discipleCount: 10 },
    resetCost: 500000,
    nodes: [
      {
        id: 'beast_1',
        name: '灵兽感应',
        description: '捕获率 +10%',
        path: 'beast',
        order: 1,
        cost: { spiritStone: 80000 },
        effects: [{ type: 'petCapture', value: 1.1 }],
      },
      {
        id: 'beast_2',
        name: '御兽基础',
        description: '宠物属性 +15%',
        path: 'beast',
        order: 2,
        cost: { spiritStone: 150000 },
        effects: [{ type: 'petPower', value: 1.15 }],
      },
      {
        id: 'beast_3',
        name: '万兽共鸣',
        description: '宠物数量上限 +3',
        path: 'beast',
        order: 3,
        cost: { spiritStone: 300000 },
        effects: [{ type: 'petSlots', value: 3 }],
      },
      {
        id: 'beast_4',
        name: '灵兽进化',
        description: '解锁宠物进化',
        path: 'beast',
        order: 4,
        cost: { spiritStone: 600000 },
        effects: [{ type: 'petEvolution', value: 1 }],
      },
      {
        id: 'beast_5',
        name: '百兽之王',
        description: '宠物可参战',
        path: 'beast',
        order: 5,
        cost: { spiritStone: 1200000 },
        effects: [{ type: 'petCombat', value: 1 }],
      },
    ],
  },
}

export function canUnlockSectPath(sectLevel: number, discipleCount: number): boolean {
  return sectLevel >= 5 && discipleCount >= 10
}

export function getPathNode(pathId: SectPath, nodeId: string): SectPathNode | undefined {
  if (pathId === 'none') return undefined
  return SECT_PATHS[pathId]?.nodes.find((n) => n.id === nodeId)
}

export function getNextNode(pathId: SectPath, unlockedIds: string[]): SectPathNode | null {
  if (pathId === 'none') return null
  const nodes = SECT_PATHS[pathId]?.nodes ?? []
  const next = nodes.find((n) => !unlockedIds.includes(n.id))
  return next ?? null
}

export function getPathEffects(pathId: SectPath, unlockedIds: string[]): PathEffect[] {
  if (pathId === 'none') return []
  const nodes = SECT_PATHS[pathId]?.nodes ?? []
  return nodes.filter((n) => unlockedIds.includes(n.id)).flatMap((n) => n.effects)
}
