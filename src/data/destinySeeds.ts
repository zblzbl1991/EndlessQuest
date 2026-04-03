import type { DestinySeedDef, DestinySeedId } from '../types/destiny'

export const DESTINY_SEEDS: Record<DestinySeedId, DestinySeedDef> = {
  fortuneSeed: {
    id: 'fortuneSeed',
    name: '机缘苗',
    description: '更容易成为正向事件中心，更容易触发好运与奇遇。',
    darkCurrentFamily: 'fortune',
    defaultCombatStyle: 'control',
    baseRisk: 15,
  },
  tribulationSeed: {
    id: 'tribulationSeed',
    name: '劫火苗',
    description: '更适应极端风险，更容易承受高压后爆发，也更容易反噬。',
    darkCurrentFamily: 'tribulation',
    defaultCombatStyle: 'burst',
    baseRisk: 40,
  },
  abyssSeed: {
    id: 'abyssSeed',
    name: '心渊苗',
    description: '更容易异化与偏执，极端 build 成形率高。',
    darkCurrentFamily: 'abyss',
    defaultCombatStyle: 'sacrifice',
    baseRisk: 50,
  },
  guardianSeed: {
    id: 'guardianSeed',
    name: '护命苗',
    description: '更稳，更偏保全与续航。',
    darkCurrentFamily: 'guardian',
    defaultCombatStyle: 'tank',
    baseRisk: 10,
  },
  plunderSeed: {
    id: 'plunderSeed',
    name: '夺运苗',
    description: '更容易获得超额收益，但常伴随代价转移。',
    darkCurrentFamily: 'plunder',
    defaultCombatStyle: 'burst',
    baseRisk: 35,
  },
  afterglowSeed: {
    id: 'afterglowSeed',
    name: '残照苗',
    description: '前期带缺口，后期可能突然剧变。',
    darkCurrentFamily: 'afterglow',
    defaultCombatStyle: 'burst',
    baseRisk: 30,
  },
  anomalySeed: {
    id: 'anomalySeed',
    name: '异相苗',
    description: '极稀有、高波动，最容易承接天命事件。',
    darkCurrentFamily: 'anomaly',
    defaultCombatStyle: 'summon',
    baseRisk: 65,
  },
}

export const DESTINY_SEED_LIST = Object.values(DESTINY_SEEDS)

export function getSeedDef(id: DestinySeedId): DestinySeedDef {
  return DESTINY_SEEDS[id]
}

/** Seed rarity roll weights: [common, uncommon, rare, epic, legendary] */
export const SEED_RARITY_WEIGHTS: Record<number, number> = {
  1: 40,
  2: 30,
  3: 18,
  4: 9,
  5: 3,
}

export function rollSeedRarity(): 1 | 2 | 3 | 4 | 5 {
  const total = Object.values(SEED_RARITY_WEIGHTS).reduce((s, w) => s + w, 0)
  let roll = Math.random() * total
  for (const [rarity, weight] of Object.entries(SEED_RARITY_WEIGHTS)) {
    roll -= weight
    if (roll <= 0) return Number(rarity) as 1 | 2 | 3 | 4 | 5
  }
  return 1
}
