import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { saveGame, loadGame } from '../systems/save/SaveSystem'
import { _resetDB, getDB } from '../systems/save/db'
import { useSectStore } from '../stores/sectStore'
import { useAdventureStore } from '../stores/adventureStore'
import { useEventLogStore } from '../stores/eventLogStore'
import { useGameStore } from '../stores/gameStore'
import { serializeExponential, deserializeExponentialToNumber, safeExpCost } from '../utils/Decimal'

// ─── V2.1 工单 02：指数增长字段 {m,e} Decimal 序列化 ─────────────────────

describe('exponential payload serialization (utils/Decimal)', () => {
  it('小值保持 plain number（精确 + devtools 可读）', () => {
    expect(serializeExponential(0)).toBe(0)
    expect(serializeExponential(1234.56)).toBe(1234.56)
    expect(serializeExponential(9.9e14)).toBe(9.9e14)
  })

  it('大值转 {m,e}，往返相对精度 ≤1e-13（1e120 合法档）', () => {
    const payload = serializeExponential(2.3e45)
    expect(typeof payload).toBe('object')
    const restored = deserializeExponentialToNumber(payload)
    expect(restored / 2.3e45).toBeCloseTo(1, 13)
    // 1e120 —— 仙界量级合法值
    const huge = deserializeExponentialToNumber(serializeExponential(1.7e120))
    expect(huge / 1.7e120).toBeCloseTo(1, 13)
  })

  it('超界值（1e400 坏档）与非法输入修复为 fallback', () => {
    expect(deserializeExponentialToNumber({ m: 1, e: 400 }, 0)).toBe(0)
    expect(deserializeExponentialToNumber({ m: -1, e: 400 }, 0)).toBe(0)
    expect(deserializeExponentialToNumber({ m: NaN, e: 40 }, 7)).toBe(7)
    expect(deserializeExponentialToNumber(NaN, 3)).toBe(3)
    expect(deserializeExponentialToNumber(Infinity, 3)).toBe(3)
    expect(deserializeExponentialToNumber('garbage', 5)).toBe(5)
    expect(serializeExponential(Number('1e400'))).toBe(0)
  })

  it('safeExpCost：几何成本经 Decimal 计算，极端等级有限且封顶', () => {
    expect(safeExpCost(100, 1.15, 0)).toBe(100)
    expect(safeExpCost(100, 1.15, 10)).toBeCloseTo(100 * 1.15 ** 10, 6)
    // Math.pow 在 ~1e308 溢出为 Infinity；dec 路径必须保持有限
    expect(Number.isFinite(safeExpCost(100, 1.15, 5000))).toBe(true)
    expect(safeExpCost(100, 1.15, 5000)).toBeLessThanOrEqual(1e300)
    expect(safeExpCost(100, 1.15, 6000)).toBeLessThanOrEqual(1e300)
    expect(safeExpCost(100, 1.15, 6000)).toBeGreaterThan(0)
  })
})

describe('v16 save format (fake-indexeddb round-trip)', () => {
  beforeEach(async () => {
    _resetDB()
    await indexedDB.deleteDatabase('endlessquest_db')
    localStorage.clear()
    useSectStore.getState().reset()
    useAdventureStore.getState().reset()
    useEventLogStore.getState().reset()
    useGameStore.getState().reset()
  })

  it('大数值全字段往返：资源/修为/峰值/累计灵石无损', async () => {
    useSectStore.setState((s) => ({
      sect: {
        ...s.sect,
        resources: { spiritStone: 2.3e45, spiritEnergy: 5e17, herb: 8.8e33, ore: 1.2e21 },
        characters: s.sect.characters.map((c) => ({
          ...c,
          cultivation: 1.5e40,
          totalCultivation: 2.6e41,
        })),
        stats: { ...s.sect.stats, peakCultivationThisRun: 9.7e52, totalSpiritStoneEarned: 1.1e50 },
      },
    }))
    useGameStore.getState().startGame()
    await saveGame()

    useSectStore.getState().reset()
    useGameStore.getState().reset()
    expect(await loadGame()).toBe(true)

    const sect = useSectStore.getState().sect
    expect(sect.resources.spiritStone / 2.3e45).toBeCloseTo(1, 13)
    expect(sect.resources.spiritEnergy / 5e17).toBeCloseTo(1, 13)
    expect(sect.resources.herb / 8.8e33).toBeCloseTo(1, 13)
    expect(sect.resources.ore / 1.2e21).toBeCloseTo(1, 13)
    expect(sect.characters[0].cultivation / 1.5e40).toBeCloseTo(1, 13)
    expect(sect.characters[0].totalCultivation / 2.6e41).toBeCloseTo(1, 13)
    expect(sect.stats.peakCultivationThisRun / 9.7e52).toBeCloseTo(1, 13)
    expect(sect.stats.totalSpiritStoneEarned / 1.1e50).toBeCloseTo(1, 13)
  })

  it('v12 旧档（plain number）加载无损并升版到 v16', async () => {
    useGameStore.getState().startGame()
    await saveGame()

    // 把刚写入的档位改写回 v12 形态：指数字段全部 plain number
    const db = await getDB()
    const meta = (await db.get('meta', 1)) as Record<string, unknown> & { version: number }
    const characters = (await db.getAll('characters')) as Array<Record<string, unknown>>
    expect(meta.version).toBe(16)
    const v12Meta = {
      ...meta,
      version: 12,
      resources: {
        spiritStone: 4.2e38,
        spiritEnergy: 900,
        herb: 77,
        ore: 33,
      },
      stats: {
        ...meta.stats,
        peakCultivationThisRun: 6.6e41,
        totalSpiritStoneEarned: 8.8e40,
        totalSpiritStoneSpent: 2.2e39,
      },
    }
    await db.put('meta', v12Meta)
    await db.put('characters', { ...characters[0], cultivation: 1.5e40, totalCultivation: 2.6e41 })

    useSectStore.getState().reset()
    useGameStore.getState().reset()
    expect(await loadGame()).toBe(true)

    const sect = useSectStore.getState().sect
    expect(sect.resources.spiritStone / 4.2e38).toBeCloseTo(1, 13)
    expect(sect.resources.spiritEnergy).toBe(900)
    expect(sect.characters[0].cultivation / 1.5e40).toBeCloseTo(1, 13)
    expect(sect.stats.peakCultivationThisRun / 6.6e41).toBeCloseTo(1, 13)
    expect(sect.stats.totalSpiritStoneEarned / 8.8e40).toBeCloseTo(1, 13)
  })

  it('v13 {m,e} 坏档（1e400 payload）读档修复为 fallback', async () => {
    useGameStore.getState().startGame()
    await saveGame()

    const db = await getDB()
    const characters = (await db.getAll('characters')) as Array<Record<string, unknown>>
    await db.put('characters', { ...characters[0], cultivation: { m: 1, e: 400 }, totalCultivation: { m: 2, e: 500 } })
    const meta = (await db.get('meta', 1)) as Record<string, unknown>
    await db.put('meta', {
      ...meta,
      resources: { spiritStone: { m: 9, e: 999 }, spiritEnergy: 0, herb: 0, ore: 0 },
    })

    useSectStore.getState().reset()
    useGameStore.getState().reset()
    expect(await loadGame()).toBe(true)

    const sect = useSectStore.getState().sect
    expect(sect.characters[0].cultivation).toBe(0)
    expect(sect.characters[0].totalCultivation).toBe(0)
    expect(sect.resources.spiritStone).toBe(0)
  })
})
