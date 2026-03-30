import type { CharacterQuality } from '../types/character'
import type { CultivationPath } from '../types/character'

export interface CultivationPathDef {
  id: CultivationPath
  name: string
  description: string
  bonuses: {
    stat: string
    multiplier: number
  }[]
  skillAffinity: string[] // skill categories this path prefers
  buildingBonus?: {
    buildingType: string
    multiplier: number
  }
}

export const CULTIVATION_PATHS: Record<Exclude<CultivationPath, 'none'>, CultivationPathDef> = {
  sword: {
    id: 'sword',
    name: '剑修',
    description: '攻击力 +20%，速度 +10%',
    bonuses: [
      { stat: 'atk', multiplier: 1.2 },
      { stat: 'spd', multiplier: 1.1 },
    ],
    skillAffinity: ['attack'],
  },
  body: {
    id: 'body',
    name: '体修',
    description: 'HP +25%，防御 +15%',
    bonuses: [
      { stat: 'hp', multiplier: 1.25 },
      { stat: 'def', multiplier: 1.15 },
    ],
    skillAffinity: ['defense'],
  },
  alchemy: {
    id: 'alchemy',
    name: '丹修',
    description: '灵草产出 +30%，炼丹成功率 +10%',
    bonuses: [{ stat: 'herbYield', multiplier: 1.3 }],
    skillAffinity: ['support'],
    buildingBonus: { buildingType: 'alchemyFurnace', multiplier: 1.1 },
  },
  beast: {
    id: 'beast',
    name: '驭兽',
    description: '宠物战斗力 +25%，宠物捕获率 +15%',
    bonuses: [
      { stat: 'petPower', multiplier: 1.25 },
      { stat: 'petCapture', multiplier: 1.15 },
    ],
    skillAffinity: ['attack', 'support'],
  },
  formation: {
    id: 'formation',
    name: '阵修',
    description: '全队防御 +8%，速度 +5%（队长效果）',
    bonuses: [
      { stat: 'teamDef', multiplier: 1.08 },
      { stat: 'teamSpd', multiplier: 1.05 },
    ],
    skillAffinity: ['support', 'defense'],
  },
  void: {
    id: 'void',
    name: '虚空',
    description: '暴击 +15%，暴击伤害 +30%',
    bonuses: [
      { stat: 'crit', multiplier: 1.15 },
      { stat: 'critDmg', multiplier: 1.3 },
    ],
    skillAffinity: ['ultimate'],
  },
}

// Probability of getting a path based on quality
const PATH_CHANCE: Record<CharacterQuality, number> = {
  common: 0.2,
  spirit: 0.3,
  immortal: 0.4,
  divine: 0.5,
  chaos: 0.6,
}

export function rollCultivationPath(quality: CharacterQuality): CultivationPath {
  if (Math.random() >= PATH_CHANCE[quality]) return 'none'
  const paths = Object.keys(CULTIVATION_PATHS) as Exclude<CultivationPath, 'none'>[]
  return paths[Math.floor(Math.random() * paths.length)]
}

export function getPathDef(path: CultivationPath): CultivationPathDef | null {
  if (path === 'none') return null
  return CULTIVATION_PATHS[path] ?? null
}

export function getPathStatBonus(path: CultivationPath, stat: string): number {
  const def = getPathDef(path)
  if (!def) return 1
  return def.bonuses.find((b) => b.stat === stat)?.multiplier ?? 1
}

export function getPathName(path: CultivationPath): string {
  const def = getPathDef(path)
  return def?.name ?? ''
}
