import type { BuildingType } from '../types/sect'

export type SectRouteId = 'alchemy' | 'sword' | 'beast'

export interface SectRouteNode {
  id: string
  name: string
  description: string
  effect: string
}

export interface SectRouteDef {
  id: SectRouteId
  name: string
  description: string
  /** Which buildings get production bonuses from this route */
  buildingBonus: Partial<Record<BuildingType, number>>
  /** Description of route modifier for adventure runs */
  adventureModifier: string;
  nodes: SectRouteNode[]
}

export const SECT_ROUTES: Record<SectRouteId, SectRouteDef> = {
  alchemy: {
    id: 'alchemy',
    name: '丹道',
    description: '专注炼丹，提升丹药品产出和丹方品质',
    buildingBonus: { alchemyFurnace: 1.15 },
    adventureModifier: '丹道弟子在秘境中有更高的几率获得丹药',
    nodes: [
      { id: 'potency', name: '丹力', description: '丹药效果提升10%', effect: '丹方丹药效果 +10%' },
      { id: 'refinement', name: '提纯', description: '提纯几率提升', effect: '高品质丹药出现几率提升' },
    ],
  },
  sword: {
    id: 'sword',
    name: '剑道',
    description: '专注剑法，提升锻造品质',
    buildingBonus: { forge: 1.2 },
    adventureModifier: '剑道弟子战斗伤害提升',
    nodes: [
      { id: 'sharpness', name: '锋利', description: '武器攻击 +15%', effect: '攻击伤害 +15%' },
      { id: 'parry', name: '格挡', description: '防御提升', effect: '格挡几率 +5%' },
    ],
  },
  beast: {
    id: 'beast',
    name: '兽道',
    description: '专注御兽,灵兽品质',
    buildingBonus: { spiritField: 1.0 },
    adventureModifier: '灵兽捕捉成功率和品质提升',
    nodes: [
      { id: 'taming', name: '驯服', description: '驯服成功率 +10%', effect: '灵兽驯服率提升' },
      { id: 'bond', name: '羁绊', description: '羁绊伤害 +15%', effect: '灵兽羁绊伤害提升' },
    ],
  },
}

