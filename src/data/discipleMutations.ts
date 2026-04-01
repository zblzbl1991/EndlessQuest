import type { CultivationPath, FateTag, SpecialtyType } from '../types/character'

export type DiscipleMutationId =
  | 'sword_intent'
  | 'jade_skin'
  | 'elixir_veins'
  | 'pack_howl'
  | 'array_eye'
  | 'rift_edge'
  | 'lucky_omen'
  | 'scar_reactor'

export interface DiscipleMutationDef {
  id: DiscipleMutationId
  name: string
  summary: string
  favoredPaths?: CultivationPath[]
  favoredSpecialties?: SpecialtyType[]
  favoredFates?: FateTag[]
  combat: {
    atk?: number
    def?: number
    spd?: number
  }
  reward: {
    spiritStone?: number
    herb?: number
    ore?: number
  }
}

export interface MutationCharacterProfile {
  cultivationPath: CultivationPath
  specialties: Array<{ type: SpecialtyType }>
  fateTags: FateTag[]
}

export const DISCIPLE_MUTATION_DEFS: Record<DiscipleMutationId, DiscipleMutationDef> = {
  sword_intent: {
    id: 'sword_intent',
    name: '剑意凝锋',
    summary: '更容易成为本局主攻手，偏爆发和收割。',
    favoredPaths: ['sword', 'void'],
    favoredSpecialties: ['combat'],
    combat: { atk: 0.18, spd: 0.08 },
    reward: { spiritStone: 0.05 },
  },
  jade_skin: {
    id: 'jade_skin',
    name: '玉骨护体',
    summary: '更稳，更适合拖长线与扛住高波动战斗。',
    favoredPaths: ['body', 'formation'],
    favoredSpecialties: ['leadership'],
    combat: { def: 0.2 },
    reward: { herb: 0.04 },
  },
  elixir_veins: {
    id: 'elixir_veins',
    name: '丹息回流',
    summary: '偏续航与恢复，能把一局滚成耐久 build。',
    favoredPaths: ['alchemy'],
    favoredSpecialties: ['alchemy', 'comprehension'],
    combat: { def: 0.08, spd: 0.05 },
    reward: { herb: 0.08 },
  },
  pack_howl: {
    id: 'pack_howl',
    name: '兽群共鸣',
    summary: '节奏更快，适合在中层开始接管战斗。',
    favoredPaths: ['beast'],
    favoredSpecialties: ['fortune', 'combat'],
    combat: { atk: 0.1, spd: 0.14 },
    reward: { ore: 0.05 },
  },
  array_eye: {
    id: 'array_eye',
    name: '阵眼洞察',
    summary: '更擅长稳住节奏，把随机局面导向可控收益。',
    favoredPaths: ['formation'],
    favoredSpecialties: ['comprehension', 'leadership'],
    combat: { def: 0.14, spd: 0.08 },
    reward: { spiritStone: 0.04, herb: 0.04 },
  },
  rift_edge: {
    id: 'rift_edge',
    name: '裂隙偏锋',
    summary: '高风险高回报的突刺型变异，更容易打出 carry 局。',
    favoredPaths: ['void', 'sword'],
    favoredSpecialties: ['combat', 'fortune'],
    favoredFates: ['heartDevilSeed'],
    combat: { atk: 0.22, spd: 0.12 },
    reward: { spiritStone: 0.06 },
  },
  lucky_omen: {
    id: 'lucky_omen',
    name: '机缘先兆',
    summary: '更偏收益侧，会把一局往资源局推。',
    favoredSpecialties: ['fortune'],
    favoredFates: ['suddenInsight', 'stableDaoHeart'],
    combat: { spd: 0.05 },
    reward: { spiritStone: 0.1, herb: 0.05, ore: 0.05 },
  },
  scar_reactor: {
    id: 'scar_reactor',
    name: '劫痕共振',
    summary: '把坏命格转成局内爆点，但波动更大。',
    favoredFates: ['tribulationScar', 'heartDevilSeed'],
    combat: { atk: 0.16, def: 0.06 },
    reward: { ore: 0.08 },
  },
}

export function getDiscipleMutationDef(id: DiscipleMutationId): DiscipleMutationDef {
  return DISCIPLE_MUTATION_DEFS[id]
}

export function pickDiscipleMutation(
  profile: MutationCharacterProfile,
  ownedMutations: DiscipleMutationId[],
  rng: () => number = Math.random
): DiscipleMutationId | null {
  const pool = Object.values(DISCIPLE_MUTATION_DEFS).filter((mutation) => !ownedMutations.includes(mutation.id))
  if (pool.length === 0) return null

  const weighted = pool.map((mutation) => {
    let weight = 1

    if (mutation.favoredPaths?.includes(profile.cultivationPath)) weight += 4
    if (mutation.favoredFates?.some((fate) => profile.fateTags.includes(fate))) weight += 3
    if (mutation.favoredSpecialties?.some((spec) => profile.specialties.some((owned) => owned.type === spec))) {
      weight += 2
    }

    return { id: mutation.id, weight }
  })

  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0)
  let roll = rng() * totalWeight
  for (const entry of weighted) {
    roll -= entry.weight
    if (roll <= 0) return entry.id
  }

  return weighted.length > 0 ? weighted[weighted.length - 1].id : null
}
