/**
 * 道祖榜（V2.2 map 工单 05）：本地自比纪录，替代排行榜/赛季。
 *
 * 纪录跨飞升/证道保留（SectStats 持久化字段）；当前轮值（进行中）由
 * currentRunTracker 逐项对比，打破纪录时生成事件高光。
 */
import type { SectStats } from '../../types'

export interface RecordKeyframes {
  /** 渡劫期最快到达（累计游戏秒）。 */
  fastestTribulationSeconds?: number
  /** 道祖期最快到达（累计游戏秒）。 */
  fastestDaozuSeconds?: number
  /** 单世最高道韵。 */
  bestDaoYunGain?: number
  /** 单世最高修为峰值。 */
  bestPeakCultivation?: number
  /** 证道次数。 */
  daoProvingCount?: number
}

/** 纪录定义（键 → 展示名 → 数值方向全部为"更小/更大更好"）。 */
export const RECORD_DEFS: {
  key: keyof RecordKeyframes
  name: string
  better: (candidate: number, current: number) => boolean
  format: (v: number) => string
}[] = [
  {
    key: 'fastestTribulationSeconds',
    name: '最快渡劫',
    better: (c, cur) => cur === 0 || (c > 0 && c < cur),
    format: (v) => `${(v / 86400).toFixed(2)} 天`,
  },
  {
    key: 'fastestDaozuSeconds',
    name: '最快道祖',
    better: (c, cur) => cur === 0 || (c > 0 && c < cur),
    format: (v) => `${(v / 86400).toFixed(2)} 天`,
  },
  {
    key: 'bestDaoYunGain',
    name: '单世最高道韵',
    better: (c, cur) => c > cur,
    format: (v) => `${v}`,
  },
  {
    key: 'bestPeakCultivation',
    name: '单世最高修为峰值',
    better: (c, cur) => c > cur,
    format: (v) => v.toExponential(2),
  },
]

/** 从 stats 读取纪录（新字段缺省 0 = 未创建纪录）。 */
export function readRecords(stats: SectStats): RecordKeyframes {
  return {
    fastestTribulationSeconds: stats.fastestTribulationSeconds ?? 0,
    fastestDaozuSeconds: stats.fastestDaozuSeconds ?? 0,
    bestDaoYunGain: stats.bestDaoYunGain ?? 0,
    bestPeakCultivation: stats.bestPeakCultivation ?? 0,
    daoProvingCount: stats.daoProvingCount ?? 0,
  }
}

/**
 * 尝试更新一项纪录。
 * 返回 null 表示未打破；否则返回被打破前的旧值（供"打破纪录"事件文案）。
 */
export function attemptRecord(stats: SectStats, key: keyof RecordKeyframes, value: number): number | null {
  const def = RECORD_DEFS.find((d) => d.key === key)
  if (!def) return null
  const current = (stats[key] as number | undefined) ?? 0
  if (!def.better(value, current)) return null
  ;(stats as unknown as Record<string, number>)[key] = value
  return current
}
