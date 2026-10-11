import type { ItemQuality } from '../types/item'

export const QUALITY_ORDER: ItemQuality[] = ['common', 'spirit', 'immortal', 'divine', 'chaos']

export const QUALITY_NAMES: Record<ItemQuality, string> = {
  common: '凡品',
  spirit: '灵品',
  immortal: '仙品',
  divine: '神品',
  chaos: '混沌',
}

export const QUALITY_COLORS: Record<ItemQuality, string> = {
  common: 'var(--color-quality-common)',
  spirit: 'var(--color-quality-spirit)',
  immortal: 'var(--color-quality-immortal)',
  divine: 'var(--color-quality-divine)',
  chaos: 'var(--color-quality-chaos)',
}

/**
 * Quality colors specifically for technique scroll items.
 * Maps each technique tier to its display color.
 */
export const TECHNIQUE_SCROLL_COLORS: Record<ItemQuality, string> = {
  common: '#8B7355', // Brown — mortal tier
  spirit: '#4A9EDE', // Blue — spirit tier
  immortal: '#A855F7', // Purple — immortal tier
  divine: '#F59E0B', // Gold — divine tier
  chaos: '#EF4444', // Red — chaos tier
}

export const ENHANCE_RATES: number[] = [1.0, 1.0, 1.0, 1.0, 1.0, 0.9, 0.86, 0.82, 0.78, 0.74, 0.6, 0.5, 0.4, 0.3, 0.2]

export function getEnhanceRate(level: number): number {
  if (level < 1 || level > 15) return 0
  return ENHANCE_RATES[level - 1]
}

export const EQUIP_SLOTS = [
  'head',
  'armor',
  'bracer',
  'belt',
  'boots',
  'weapon',
  'accessory1',
  'accessory2',
  'talisman',
] as const

export const EQUIP_SLOT_NAMES: Record<string, string> = {
  head: '头冠',
  armor: '道袍',
  bracer: '护腕',
  belt: '腰带',
  boots: '鞋子',
  weapon: '武器',
  accessory1: '饰品',
  accessory2: '饰品',
  talisman: '法宝',
}

// ─── 仙品材料（V2.1 工单 08）：仙界秘境掉落的高阶天材地宝 ─────────────────

export const IMMORTAL_MATERIAL_TIER_NAMES = ['', '下品', '中品', '上品', '极品'] as const

/**
 * 仙品材料：quality 恒 immortal，品阶（1-4）由掉落地深化（层数 × 世界层），
 * 表现在名称与卖价上。灵石卖价 ~2^tier × 5e4（仙界 economyMult 域内可感）。
 */
export function createImmortalMaterial(category: 'herb' | 'ore', tier: number) {
  const t = Math.min(4, Math.max(1, Math.floor(tier)))
  const baseName = category === 'herb' ? '仙灵草' : '仙尘晶'
  const tierName = IMMORTAL_MATERIAL_TIER_NAMES[t]
  return {
    id: `immortal_${category}_${t}_${Math.random().toString(36).slice(2, 8)}`,
    name: `${tierName}${baseName}`,
    quality: 'immortal' as const,
    type: 'material' as const,
    category,
    description:
      category === 'herb' ? '仙界灵田孕育的灵药，药性玄妙，传闻可入仙丹。' : '仙界矿脉凝成的晶砂，蕴含精纯道韵。',
    sellPrice: 5e4 * 2 ** (t - 1),
  }
}
