import type { AdventureReportSummary, Sect } from '../../types'
import type { SectArchetype } from '../../types/sect'
import { getArchetypeName } from '../../data/sectArchetypes'
import type { Dungeon } from '../../types/adventure'
import { BUILDING_DEFS } from '../../data/buildings'
import { LEGACY_REWARD_TIERS } from '../../data/legacy'
import { getCultivationNeeded } from '../../data/realms'
import { canBreakthrough } from '../cultivation/CultivationEngine'
import { canAscend } from './LegacySystem'
import { getCharacterDisposition } from '../character/CharacterDispositionSystem'

export interface SectStageGoal {
  id: string
  title: string
  detail: string
  progress: string
  link: string
  priority: 'high' | 'medium' | 'low'
}

function getHighestRealmCharacter(sect: Sect) {
  return sect.characters.reduce<(typeof sect.characters)[number] | null>((best, character) => {
    if (!best) return character
    if (character.realm > best.realm) return character
    if (character.realm === best.realm && character.realmStage > best.realmStage) return character
    return best
  }, null)
}

function countVaultItemByName(sect: Sect, itemName: string): number {
  return sect.vault.reduce((sum, stack) => (stack.item.name === itemName ? sum + stack.quantity : sum), 0)
}

function pickLegacyForgeGoal(sect: Sect): SectStageGoal | null {
  if (!sect.legacy.unlockedDungeons.includes('guixuRift')) return null

  const hasFirstLegacyForge = sect.archiveMilestones.some((milestone) => milestone.id === 'firstLegacyForge')
  const hasLegacyPair = sect.archiveMilestones.some((milestone) => milestone.id === 'legacyForgePair')
  const hasLegacyTrinity = sect.archiveMilestones.some((milestone) => milestone.id === 'legacyForgeTrinity')

  const forgeLevel = sect.buildings.find((building) => building.type === 'forge')?.level ?? 0
  const requiredForgeLevel = hasLegacyPair && !hasLegacyTrinity ? 8 : 7
  if (forgeLevel < requiredForgeLevel) {
    return {
      id: hasLegacyPair && !hasLegacyTrinity ? 'legacy_forge_trinity_unlock' : 'legacy_forge_unlock',
      title: hasLegacyPair && !hasLegacyTrinity ? '把炼器坊抬到 Lv8' : '把炼器坊抬到 Lv7',
      detail:
        hasLegacyPair && !hasLegacyTrinity
          ? '双遗共鸣已经成型，下一步是把炼器坊抬到更高阶，承接第三件归墟遗器。'
          : '归墟裂隙已经开启，但要把潮晶和残片真正变成后期战力，还需要高阶炼器坊承接遗产锻造。',
      progress: `炼器坊 Lv${forgeLevel} / 目标 Lv${requiredForgeLevel}`,
      link: '/buildings',
      priority: 'high',
    }
  }

  const tideCrystalCount = countVaultItemByName(sect, '归墟潮晶')
  const abyssShardCount = countVaultItemByName(sect, '渊息残片')

  if (hasLegacyPair && !hasLegacyTrinity && tideCrystalCount >= 3 && abyssShardCount >= 2) {
    return {
      id: 'legacy_forge_trinity_ready',
      title: '第三件归墟遗器可开炉',
      detail: '双遗共鸣后的第三段材料已经凑齐，现在最值的是锻出归墟镇界袍，把归墟线推成真正的终盘挂机循环。',
      progress: `潮晶 ${tideCrystalCount}/3 路 残片 ${abyssShardCount}/2`,
      link: '/buildings',
      priority: 'high',
    }
  }

  if (hasLegacyTrinity) {
    return {
      id: 'legacy_forge_trinity_sustain',
      title: '三遗齐鸣已成，维持归墟终盘循环',
      detail: '现在归墟不再只是补毕业装，而是稳定产出后期收益的挂机主回路，优先守住回响模板与高阶远征。',
      progress: `潮晶 ${tideCrystalCount} 路 残片 ${abyssShardCount}`,
      link: '/adventure',
      priority: 'medium',
    }
  }

  if (tideCrystalCount >= 2 && abyssShardCount >= 1) {
    return {
      id: hasLegacyPair
        ? 'legacy_forge_pair_ready'
        : hasFirstLegacyForge
          ? 'legacy_forge_ready_repeat'
          : 'legacy_forge_ready',
      title: hasLegacyPair
        ? '双遗共鸣后可继续稳刷遗材'
        : hasFirstLegacyForge
          ? '可以再开一炉归墟遗器'
          : '归墟遗材已可开炉',
      detail: hasLegacyPair
        ? '双遗器已经成型，归墟事件收益也会更好。现在最值的是维持高阶远征模板，把遗材循环稳定跑起来。'
        : hasFirstLegacyForge
          ? '第一件遗产装备已经成型，现在最值的是继续补第二件，把归墟循环真正转成宗门的后期常驻战力。'
          : '材料已经够打一件归墟道兵，或者先做镇渊遗符稳住主力。现在最值的是把遗产掉落兑现成常驻战力。',
      progress: `潮晶 ${tideCrystalCount}/2 路 残片 ${abyssShardCount}/1`,
      link: '/buildings',
      priority: 'high',
    }
  }

  if (hasLegacyPair) {
    return {
      id: 'legacy_forge_trinity_prepare',
      title: '继续刷归墟补第三件遗器',
      detail: '双遗共鸣已经打开了更高收益的归墟循环，继续稳定挂回响模板，把第三件遗器的材料补齐。',
      progress: `潮晶 ${tideCrystalCount}/3 路 残片 ${abyssShardCount}/2`,
      link: '/adventure',
      priority: tideCrystalCount > 0 || abyssShardCount > 0 ? 'high' : 'medium',
    }
  }

  return {
    id: hasFirstLegacyForge ? 'legacy_forge_prepare_repeat' : 'legacy_forge_prepare',
    title: hasFirstLegacyForge ? '继续刷归墟补第二件遗器' : '继续远征归墟裂隙补齐遗材',
    detail: hasFirstLegacyForge
      ? '归墟随机事件会掉潮晶，古修遗府会带回渊息残片。继续稳定刷图，就能把第二件遗产器也补出来。'
      : '归墟随机事件会掉潮晶，古修遗府会带回渊息残片。把材料凑齐后，炼器坊就能接手这条后期成长线。',
    progress: `潮晶 ${tideCrystalCount}/2 路 残片 ${abyssShardCount}/1`,
    link: '/adventure',
    priority: tideCrystalCount > 0 || abyssShardCount > 0 ? 'high' : 'medium',
  }
}

function pickAscensionGoal(sect: Sect): SectStageGoal | null {
  const ascensionCheck = canAscend(sect)
  const nextTier = LEGACY_REWARD_TIERS.find((tier) => tier.ascensionCount > sect.legacy.ascensionCount)

  if (ascensionCheck.canAscend) {
    return {
      id: 'ascension_ready',
      title: '飞升时机已至',
      detail: nextTier
        ? `现在飞升会直接拿到下一阶段遗产：${nextTier.description}。`
        : '当前轮回已经满足飞升条件，可以考虑进入下一轮更高效的挂机循环。',
      progress: '飞升条件已满足',
      link: '/',
      priority: 'high',
    }
  }

  if (nextTier) {
    return {
      id: 'ascension_prepare',
      title: '为下一次飞升做准备',
      detail: `下一阶段飞升会解锁：${nextTier.description}`,
      progress: `当前轮回 ${sect.legacy.ascensionCount} 次 -> 目标 ${nextTier.ascensionCount} 次`,
      link: '/',
      priority: sect.legacy.ascensionCount >= 2 ? 'medium' : 'low',
    }
  }

  return null
}

function pickRealmGoal(sect: Sect): SectStageGoal | null {
  const candidate = sect.characters
    .filter((character) => canBreakthrough(character))
    .sort((left, right) => {
      const leftNeed = getCultivationNeeded(left.realm, left.realmStage)
      const rightNeed = getCultivationNeeded(right.realm, right.realmStage)
      const leftRatio = leftNeed === Infinity ? 0 : left.cultivation / leftNeed
      const rightRatio = rightNeed === Infinity ? 0 : right.cultivation / rightNeed
      return rightRatio - leftRatio
    })[0]

  if (candidate) {
    const needed = getCultivationNeeded(candidate.realm, candidate.realmStage)
    const ratio = needed === Infinity ? 0 : Math.min(100, Math.floor((candidate.cultivation / needed) * 100))
    return {
      id: `realm_${candidate.id}`,
      title: `推动 ${candidate.name} 冲关`,
      detail: '境界突破是中期滚雪球最直接的跃迁点，优先保证这名弟子的闭关与供给。',
      progress: `冲关准备 ${ratio}%`,
      link: '/characters',
      priority: ratio >= 90 ? 'high' : 'medium',
    }
  }

  const highest = getHighestRealmCharacter(sect)
  if (!highest) return null

  return {
    id: 'realm_growth',
    title: '继续抬高宗门境界线',
    detail: '优先养出新的高境界主力，才能打开更高阶秘境和飞升条件。',
    progress: `${highest.name} 当前境界 ${highest.realm}-${highest.realmStage}`,
    link: '/characters',
    priority: 'medium',
  }
}

function pickBuildingGoal(sect: Sect): SectStageGoal | null {
  const lowestBuilding = [...sect.buildings].sort((left, right) => left.level - right.level)[0]
  if (!lowestBuilding) return null

  if (lowestBuilding.level < 5) {
    const buildingName =
      BUILDING_DEFS.find((building) => building.type === lowestBuilding.type)?.name ?? lowestBuilding.type
    return {
      id: `building_${lowestBuilding.type}`,
      title: '补齐建筑底盘',
      detail: '主殿与关键产线越早过 5 级，越容易进入稳定飞升节奏。',
      progress: `${buildingName} 当前 Lv${lowestBuilding.level} / 目标 Lv5`,
      link: '/buildings',
      priority: 'high',
    }
  }

  return {
    id: 'building_refine',
    title: '优化产线与库存规则',
    detail: '当前基础建设已经达标，接下来更重要的是让产线长期稳定、少浪费。',
    progress: '已完成全建筑 Lv5 底线',
    link: '/buildings',
    priority: 'low',
  }
}

function pickAdventureGoal(sect: Sect, reports: AdventureReportSummary[], dungeons: Dungeon[]): SectStageGoal | null {
  const highest = getHighestRealmCharacter(sect)
  if (!highest) return null

  const unlocked = dungeons.filter(
    (dungeon) =>
      highest.realm > dungeon.unlockRealm ||
      (highest.realm === dungeon.unlockRealm && highest.realmStage >= dungeon.unlockStage)
  )
  const targetDungeon = unlocked[unlocked.length - 1]
  if (!targetDungeon) return null

  const latest = reports[0]
  if (latest && latest.result === 'failed') {
    return {
      id: 'adventure_recover',
      title: '调整远征模板后再冲图',
      detail: '最近一次远征失利，先稳住队伍和补给，再继续往更高层推进。',
      progress: `最近失利于 ${latest.dungeonId} 第 ${latest.floorsCleared} 层`,
      link: '/adventure',
      priority: 'high',
    }
  }

  return {
    id: `adventure_${targetDungeon.id}`,
    title: `推进 ${targetDungeon.name}`,
    detail:
      sect.legacy.ascensionCount < 5
        ? '把当前能进的最高阶秘境打稳，是拿到下一轮飞升资本和隐藏内容前置资源的关键。'
        : '高阶秘境已经是中后期的主要成长来源，持续稳住模板收益会比频繁手调更重要。',
    progress: `当前可挑战最高秘境 路 ${targetDungeon.name}`,
    link: '/adventure',
    priority: 'medium',
  }
}

export interface SectStagePathOption {
  recommendedArchetype: SectArchetype
  archetypeName: string
  immediateBenefit: string
  cost: string
  rationale: string
}

export function buildPathOptions(sect: Sect): SectStagePathOption[] {
  const currentArchetype = sect.currentArchetype
  const recoveringCount = sect.characters.filter((c) => c.status === 'recovering').length
  const hasHighAdventure = sect.characters.some((c) => {
    const disposition = getCharacterDisposition(c)
    return disposition.adventure.band === 'high'
  })

  const options: SectStagePathOption[] = []

  // Suggest swordBurst if not current and have high adventure disciples
  if (currentArchetype !== 'swordBurst' && hasHighAdventure) {
    options.push({
      recommendedArchetype: 'swordBurst',
      archetypeName: getArchetypeName('swordBurst'),
      immediateBenefit: '远征效率提升，推进更快',
      cost: '恢复压力增大，容错率降低',
      rationale: '宗门中有高出战价值弟子，适合进攻型路线',
    })
  }

  // Suggest pillSustain if recovering is high
  if (currentArchetype !== 'pillSustain' && recoveringCount >= 2) {
    options.push({
      recommendedArchetype: 'pillSustain',
      archetypeName: getArchetypeName('pillSustain'),
      immediateBenefit: '恢复速度加快，战损可控',
      cost: '推进速度放慢，爆发收益减少',
      rationale: '当前恢复压力大，稳健路线更适合',
    })
  }

  // Suggest arrayGuard if low resources
  if (currentArchetype !== 'arrayGuard' && sect.resources.spiritStone < 300) {
    options.push({
      recommendedArchetype: 'arrayGuard',
      archetypeName: getArchetypeName('arrayGuard'),
      immediateBenefit: '战损降低，长期挂机更稳定',
      cost: '收益上限受限，难以抓住高风险机会',
      rationale: '灵石储备紧张，先稳住基础',
    })
  }

  // Suggest beastHarvest if many pets
  if (currentArchetype !== 'beastHarvest' && sect.pets.length >= 3) {
    options.push({
      recommendedArchetype: 'beastHarvest',
      archetypeName: getArchetypeName('beastHarvest'),
      immediateBenefit: '灵宠采集加成，资源收益提升',
      cost: '战力依赖灵宠，前期需要投入',
      rationale: '已有足够灵宠基础，可以发挥采集路线优势',
    })
  }

  return options.slice(0, 2)
}

export function buildSectStageGoals(
  sect: Sect,
  reports: AdventureReportSummary[],
  dungeons: Dungeon[]
): SectStageGoal[] {
  return [
    pickAscensionGoal(sect),
    pickLegacyForgeGoal(sect),
    pickRealmGoal(sect),
    pickBuildingGoal(sect),
    pickAdventureGoal(sect, reports, dungeons),
  ]
    .filter((goal): goal is SectStageGoal => Boolean(goal))
    .sort((left, right) => {
      const order = { high: 3, medium: 2, low: 1 }
      return order[right.priority] - order[left.priority]
    })
    .slice(0, 3)
}
