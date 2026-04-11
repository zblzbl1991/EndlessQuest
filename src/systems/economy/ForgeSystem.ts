import type { ArchiveMilestoneId } from '../../types/sect'
import type { Equipment, EquipSlot, ItemQuality } from '../../types/item'
import { generateEquipment } from '../item/ItemGenerator'

export interface ForgeMaterialCost {
  itemName: string
  quantity: number
}

export interface ForgeRecipe {
  id: string
  name: string
  minForgeLevel: number
  quality: ItemQuality
  cost: { ore: number; spiritStone: number }
  successRate: number
  description?: string
  forcedSlot?: EquipSlot
  materialCosts?: ForgeMaterialCost[]
  legacy?: boolean
  requiredMilestone?: ArchiveMilestoneId
}

export const FORGE_RECIPES: ForgeRecipe[] = [
  {
    id: 'forge_common',
    name: '锻造凡品装备',
    minForgeLevel: 3,
    quality: 'common',
    cost: { ore: 20, spiritStone: 50 },
    successRate: 1.0,
  },
  {
    id: 'forge_spirit',
    name: '锻造灵品装备',
    minForgeLevel: 3,
    quality: 'spirit',
    cost: { ore: 80, spiritStone: 200 },
    successRate: 0.8,
  },
  {
    id: 'forge_spirit_offensive',
    name: '锻造灵品利器',
    minForgeLevel: 3,
    quality: 'spirit',
    cost: { ore: 60, spiritStone: 250 },
    successRate: 0.75,
  },
  {
    id: 'forge_spirit_defensive',
    name: '锻造灵品重甲',
    minForgeLevel: 3,
    quality: 'spirit',
    cost: { ore: 100, spiritStone: 150 },
    successRate: 0.85,
  },
  {
    id: 'forge_immortal',
    name: '锻造仙品装备',
    minForgeLevel: 5,
    quality: 'immortal',
    cost: { ore: 300, spiritStone: 1000 },
    successRate: 0.5,
  },
  {
    id: 'forge_immortal_offensive',
    name: '锻造仙品利器',
    minForgeLevel: 5,
    quality: 'immortal',
    cost: { ore: 250, spiritStone: 1200 },
    successRate: 0.45,
  },
  {
    id: 'forge_immortal_defensive',
    name: '锻造仙品重甲',
    minForgeLevel: 5,
    quality: 'immortal',
    cost: { ore: 400, spiritStone: 800 },
    successRate: 0.55,
  },
  {
    id: 'forge_divine',
    name: '锻造神品装备',
    minForgeLevel: 7,
    quality: 'divine',
    cost: { ore: 1000, spiritStone: 5000 },
    successRate: 0.25,
  },
  {
    id: 'forge_divine_offensive',
    name: '锻造神品利器',
    minForgeLevel: 7,
    quality: 'divine',
    cost: { ore: 900, spiritStone: 5500 },
    successRate: 0.2,
  },
  {
    id: 'forge_divine_defensive',
    name: '锻造神品重甲',
    minForgeLevel: 7,
    quality: 'divine',
    cost: { ore: 1200, spiritStone: 4500 },
    successRate: 0.3,
  },
  {
    id: 'forge_guixu_weapon',
    name: '归墟道兵',
    minForgeLevel: 7,
    quality: 'chaos',
    cost: { ore: 1600, spiritStone: 6800 },
    successRate: 0.55,
    forcedSlot: 'weapon',
    materialCosts: [
      { itemName: '归墟潮晶', quantity: 2 },
      { itemName: '渊息残片', quantity: 1 },
    ],
    legacy: true,
    description: '以归墟裂隙深处的遗材重铸道兵，为宗门主力准备高风险高收益的后期武器。',
  },
  {
    id: 'forge_guixu_talisman',
    name: '镇渊遗符',
    minForgeLevel: 7,
    quality: 'chaos',
    cost: { ore: 900, spiritStone: 6200 },
    successRate: 0.6,
    forcedSlot: 'talisman',
    materialCosts: [
      { itemName: '归墟潮晶', quantity: 1 },
      { itemName: '渊息残片', quantity: 1 },
    ],
    legacy: true,
    description: '将归墟余响封入法符，可同时补足后期护持、节奏与爆发。',
  },
  {
    id: 'forge_guixu_armor',
    name: '归墟镇界袍',
    minForgeLevel: 8,
    quality: 'chaos',
    cost: { ore: 2400, spiritStone: 9200 },
    successRate: 0.45,
    forcedSlot: 'armor',
    materialCosts: [
      { itemName: '归墟潮晶', quantity: 3 },
      { itemName: '渊息残片', quantity: 2 },
    ],
    legacy: true,
    requiredMilestone: 'legacyForgePair',
    description: '双遗共鸣后才能锻成的第三件遗器，能把归墟回响固化为宗门的结界与维持力。',
  },
]

export const FORGE_SLOTS: EquipSlot[] = [
  'head',
  'armor',
  'bracer',
  'belt',
  'boots',
  'weapon',
  'accessory1',
  'accessory2',
  'talisman',
]

export function canForge(
  recipe: ForgeRecipe,
  resources: { ore: number; spiritStone: number },
  forgeLevel: number,
  materialCounts: Record<string, number> = {},
  unlockedMilestones: ArchiveMilestoneId[] = []
): boolean {
  if (forgeLevel < recipe.minForgeLevel) return false
  if (recipe.requiredMilestone && !unlockedMilestones.includes(recipe.requiredMilestone)) return false
  if (resources.ore < recipe.cost.ore) return false
  if (resources.spiritStone < recipe.cost.spiritStone) return false

  for (const material of recipe.materialCosts ?? []) {
    if ((materialCounts[material.itemName] ?? 0) < material.quantity) return false
  }

  return true
}

export function forgeEquipment(
  recipe: ForgeRecipe,
  forgeLevel: number,
  forgeBuffSuccessBonus: number
): Equipment | null {
  if (forgeLevel < recipe.minForgeLevel) return null
  const effectiveRate = Math.min(1, recipe.successRate + forgeBuffSuccessBonus)
  if (Math.random() > effectiveRate) return null

  const slot = recipe.forcedSlot ?? FORGE_SLOTS[Math.floor(Math.random() * FORGE_SLOTS.length)]
  return generateEquipment(slot, recipe.quality)
}

export function getAvailableForgeRecipes(forgeLevel: number): ForgeRecipe[] {
  return FORGE_RECIPES.filter((recipe) => recipe.minForgeLevel <= forgeLevel)
}
