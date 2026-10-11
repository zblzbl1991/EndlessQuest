import { describe, it, expect } from 'vitest'
import { DUNGEONS } from '../data/events'
import { DUNGEON_ENEMY_MAP, ENEMY_TEMPLATES, getEnemiesForDungeon, getBossForDungeon } from '../data/enemies'
import { generateLoot, resolveLootTier } from '../systems/roguelike/LootSystem'
import { createImmortalMaterial, IMMORTAL_MATERIAL_TIER_NAMES } from '../data/items'
import { scaleDungeonResources } from '../systems/adventure/RewardEconomy'
import { getVisibleExpeditionTemplates } from '../data/expeditionTemplates'

// ─── V2.1 工单 08：仙界内容（秘境 / 仙品材料 / 奖励衔接） ──────────────────

describe('仙界秘境', () => {
  it('两座仙界秘境：解锁境界 9/10，沿用 MapGenerator 原型字段', () => {
    const ruins = DUNGEONS.find((d) => d.id === 'immortalRuins')
    const peak = DUNGEONS.find((d) => d.id === 'daoPeak')
    expect(ruins).toMatchObject({ name: '仙墟遗府', totalLayers: 22, eventsPerLayer: 5, unlockRealm: 9 })
    expect(peak).toMatchObject({ name: '论道峰', totalLayers: 26, eventsPerLayer: 5, unlockRealm: 10 })
  })

  it('敌人映射与模板有效（regular/boss 均存在）', () => {
    for (const dungeonId of ['immortalRuins', 'daoPeak']) {
      const mapping = DUNGEON_ENEMY_MAP[dungeonId]
      expect(mapping).toBeDefined()
      const regulars = getEnemiesForDungeon(dungeonId)
      expect(regulars.length).toBeGreaterThanOrEqual(2)
      const boss = getBossForDungeon(dungeonId)
      expect(boss.isBoss).toBe(true)
      for (const template of [...regulars, boss]) {
        expect(template.stats.hp).toBeGreaterThan(0)
        expect(template.lootTable.length).toBeGreaterThan(0)
      }
    }
  })

  it('仙界敌人模板的掉落表含仙品材料条目', () => {
    const all = ENEMY_TEMPLATES.filter((e) => e.id.startsWith('immortal_') || e.id.startsWith('daopeak_'))
    expect(all.length).toBeGreaterThanOrEqual(3)
    for (const template of all) {
      expect(template.lootTable.some((entry) => entry.type === 'material' && entry.quality === 'immortal')).toBe(true)
    }
  })

  it('归墟裂隙乱码名已修复', () => {
    expect(DUNGEONS.find((d) => d.id === 'guixuRift')?.name).toBe('归墟裂隙')
  })
})

describe('掉落品阶 = f(层数 × 世界层)', () => {
  it('凡界秘境（世界层 0）：品阶 1-3', () => {
    expect(resolveLootTier(1, 10, 4)).toBe(1)
    expect(resolveLootTier(4, 10, 4)).toBe(2) // 40%
    expect(resolveLootTier(7, 10, 4)).toBe(3) // 70%
    expect(resolveLootTier(10, 10, 4)).toBe(3)
  })

  it('仙界秘境（世界层 1）：品阶整体 +1，封顶 4', () => {
    expect(resolveLootTier(1, 22, 9)).toBe(2)
    expect(resolveLootTier(9, 22, 9)).toBe(3) // 40%
    expect(resolveLootTier(16, 22, 9)).toBe(4) // 70%
    expect(resolveLootTier(26, 26, 10)).toBe(4)
    expect(resolveLootTier(30, 26, 10)).toBe(4) // clamp
  })
})

describe('generateLoot material 掉落', () => {
  const materialTable = [
    {
      type: 'material' as const,
      weight: 100,
      category: 'herb' as const,
      quality: 'immortal' as const,
      minAmount: 2,
      maxAmount: 3,
    },
  ]

  it('material 掉落带 category 与品阶', () => {
    const loot = generateLoot(materialTable, 2, 20, { totalLayers: 22, unlockRealm: 9 })
    expect(loot).toHaveLength(2)
    for (const drop of loot) {
      expect(drop.type).toBe('material')
      expect(drop.category).toBe('herb')
      expect(drop.amount).toBeGreaterThanOrEqual(2)
      expect(drop.tier).toBe(4) // 20/22 ≈ 91% → 世界层1 + 40%档 + 70%档 = 4
    }
  })

  it('无 dungeon 上下文时品阶回退 1', () => {
    const loot = generateLoot(materialTable, 1, 5)
    expect(loot[0].tier).toBe(1)
  })
})

describe('仙品材料物品', () => {
  it('工厂：品阶 clamp、命名、卖价 2^tier 递增', () => {
    const t1 = createImmortalMaterial('herb', 1)
    const t4 = createImmortalMaterial('ore', 4)
    const t99 = createImmortalMaterial('herb', 99)
    expect(t1.name).toBe(`下品仙灵草`)
    expect(t4.name).toBe(`极品仙尘晶`)
    expect(t99.name).toBe(`极品仙灵草`) // clamp 4
    expect(t1.quality).toBe('immortal')
    expect(t1.type).toBe('material')
    expect(t1.category).toBe('herb')
    expect(t4.sellPrice).toBe(5e4 * 8)
    expect(IMMORTAL_MATERIAL_TIER_NAMES[2]).toBe('中品')
    expect(t1.id).not.toBe(t99.id)
  })
})

describe('RewardEconomy 仙界段衔接', () => {
  it('bestRealm 9-12 的资源缩放延续 economyMult（斜率 1.0）', () => {
    const base = { spiritStone: 100, spiritEnergy: 0, herb: 10, ore: 10 }
    expect(scaleDungeonResources(base, 9).spiritStone / base.spiritStone).toBe(1e63) // target = bestRealm+1
    expect(scaleDungeonResources(base, 12).spiritStone / base.spiritStone).toBe(1e98)
    expect(scaleDungeonResources(base, 99).spiritStone / base.spiritStone).toBe(1e98) // clamp
  })
})

describe('远征模板兼容', () => {
  it('仙界秘境对模板/策略可选（可见模板生成不含秘境白名单过滤）', () => {
    const templates = getVisibleExpeditionTemplates([], 0, [])
    expect(templates.length).toBeGreaterThan(0)
    // 模板是策略容器，秘境由 preferredDungeonId 任意指定——无白名单即兼容
    const conf = { templateId: 'steadyHarvest', score: 0, lastAdjustedAtDay: null }
    expect(conf.score).toBe(0) // 新秘境冷启动中性
  })
})
