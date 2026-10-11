/**
 * 洞天福地（V2.2 map 工单 04）：化神解锁的派驻配置层。
 *
 * 洞天 = 宗门级放置槽位：派驻 1 名 idle 弟子，收益 = f(资质) 的宗门被动。
 * 配置决策在"把谁放进哪个洞天"，数值带对齐同期 Milestone 的 20~35%。
 */

export interface CaveHeavenDef {
  id: string
  name: string
  /** 解锁所需宗门最高境界（化神=4 起）。 */
  unlockRealm: number
  description: string
  effect: CaveHeavenEffect
}

export type CaveHeavenEffect =
  | { kind: 'cultivationMult'; perAptitude: number }
  | { kind: 'resourceMult'; resource: 'spiritStone' | 'herb' | 'ore' | 'spiritEnergy'; perAptitude: number }
  | { kind: 'lootMult'; perAptitude: number }
  | { kind: 'offlineHours'; perAptitude: number }
  | { kind: 'breakthroughBonus'; perAptitude: number }

export const CAVE_HEAVENS: CaveHeavenDef[] = [
  {
    id: 'springCave',
    name: '灵泉洞',
    unlockRealm: 4,
    description: '灵泉洗髓，派驻弟子可加速全宗修炼。',
    effect: { kind: 'cultivationMult', perAptitude: 0.06 },
  },
  {
    id: 'herbValley',
    name: '药王谷',
    unlockRealm: 5,
    description: '药王遗府，派驻弟子可提升灵草产量。',
    effect: { kind: 'resourceMult', resource: 'herb', perAptitude: 0.25 },
  },
  {
    id: 'treasureCliff',
    name: '藏宝崖',
    unlockRealm: 6,
    description: '藏宝之地，派驻弟子可提升秘境掉落。',
    effect: { kind: 'lootMult', perAptitude: 0.2 },
  },
  {
    id: 'timeCourt',
    name: '时之庭',
    unlockRealm: 7,
    description: '时光流速异样的庭院，派驻弟子可延长离线收益上限。',
    effect: { kind: 'offlineHours', perAptitude: 6 },
  },
  {
    id: 'daoCliff',
    name: '悟道崖',
    unlockRealm: 8,
    description: '崖壁刻满前人悟道真意，派驻弟子可提升突破成功率。',
    effect: { kind: 'breakthroughBonus', perAptitude: 0.03 },
  },
]

/** 洞天数量 = 已解锁槽位（化神 1 个，每 +1 大境界 +1，渡劫共 5 个）。 */
export function caveHeavenSlotCount(bestRealm: number): number {
  return Math.max(0, Math.min(CAVE_HEAVENS.length, bestRealm - 3))
}

/** 按解锁境界返回当前可用的洞天列表。 */
export function unlockedCaveHeavens(bestRealm: number): CaveHeavenDef[] {
  return CAVE_HEAVENS.filter((c) => bestRealm >= c.unlockRealm)
}

/**
 * 弟子资质（0~1 归一）：灵根 40% + 悟性 40% + 品质 20%。
 * 灵根/悟性以 10 为基准、30 封顶；品质 divine/chaos 记满档。
 */
export function calcAptitude(character: {
  cultivationStats: { spiritualRoot: number; comprehension: number }
  quality: string
}): number {
  const root = Math.min(30, Math.max(0, character.cultivationStats.spiritualRoot)) / 30
  const comp = Math.min(30, Math.max(0, character.cultivationStats.comprehension)) / 30
  const qualityScore =
    character.quality === 'chaos'
      ? 1
      : character.quality === 'divine'
        ? 0.85
        : character.quality === 'immortal'
          ? 0.6
          : character.quality === 'spirit'
            ? 0.35
            : 0.1
  return root * 0.4 + comp * 0.4 + qualityScore * 0.2
}

export interface CaveHeavenAssignments {
  /** slotId（= 洞天 id）→ 派驻弟子 id。 */
  assignments: Record<string, string>
}

/** 聚合全部洞天被动（仅统计有效派驻：弟子存在且 idle 状态语义由调用方保证）。 */
export function aggregateCaveHeavenEffects(
  bestRealm: number,
  assignments: Record<string, string>,
  characters: Array<Parameters<typeof calcAptitude>[0] & { id: string; status?: string }>
): {
  cultivationMult: number
  resourceMult: { spiritStone: number; herb: number; ore: number; spiritEnergy: number }
  lootMult: number
  offlineHours: number
  breakthroughBonus: number
} {
  const result = {
    cultivationMult: 0,
    resourceMult: { spiritStone: 0, herb: 0, ore: 0, spiritEnergy: 0 },
    lootMult: 0,
    offlineHours: 0,
    breakthroughBonus: 0,
  }
  const unlocked = new Set(unlockedCaveHeavens(bestRealm).map((c) => c.id))
  const charById = new Map(characters.map((c) => [c.id, c]))

  for (const cave of CAVE_HEAVENS) {
    if (!unlocked.has(cave.id)) continue
    const characterId = assignments[cave.id]
    if (!characterId) continue
    const character = charById.get(characterId)
    if (!character || character.status !== 'idle') continue // 派驻弟子须在洞府中
    const aptitude = calcAptitude(character)
    const scaled = aptitude * (cave.effect.perAptitude / (cave.effect.kind === 'offlineHours' ? 1 : 1))
    switch (cave.effect.kind) {
      case 'cultivationMult':
        result.cultivationMult += scaled
        break
      case 'resourceMult':
        result.resourceMult[cave.effect.resource] += scaled
        break
      case 'lootMult':
        result.lootMult += scaled
        break
      case 'offlineHours':
        result.offlineHours += aptitude * 6
        break
      case 'breakthroughBonus':
        result.breakthroughBonus += scaled
        break
    }
  }
  return result
}
