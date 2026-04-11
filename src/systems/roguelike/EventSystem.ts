import type { DungeonEvent } from '../../types/adventure'
import type { AnyItem } from '../../types/item'
import {
  getEnemiesForDungeon,
  getBossForDungeon,
  createCombatUnitFromEnemy,
  adjustEnemyByTeamPower,
  scaleBossStats,
  type EnemyTemplate,
} from '../../data/enemies'
import { EQUIP_SLOTS } from '../../data/items'
import { getTechniqueById } from '../../data/techniquesTable'
import type { Resources } from '../../types/sect'
import type { CombatResult, CombatUnit } from '../combat/CombatEngine'
import { hasAffix, calcShield } from '../combat/AffixSystem'
import { simulateCombat } from '../combat/CombatEngine'
import { generateEquipment } from '../item/ItemGenerator'
import type { ItemQuality } from '../../types/item'
import { pickTechniqueForFloor } from '../technique/TechniqueSystem'
import { useSectStore } from '../../stores/sectStore'
import type { LootResult } from './LootSystem'
import { generateLoot } from './LootSystem'

export interface ShopOffer {
  name: string
  description: string
  cost: number
  effect: 'heal' | 'skip'
  value: number
}

const SHOP_ITEMS: ShopOffer[] = [
  { name: 'Healing Dew', description: 'Restore 30% team HP.', cost: 100, effect: 'heal', value: 0.3 },
  { name: 'Shadow Step Token', description: 'Skip the current floor.', cost: 200, effect: 'skip', value: 0 },
]

export interface EventResult {
  type: DungeonEvent['type']
  success: boolean
  reward: { spiritStone: number; herb: number; ore: number }
  itemRewards: AnyItem[]
  combatResult?: CombatResult
  message: string
  hpChanges: Record<string, number>
  techniqueReward?: { techniqueId: string }
  shopOffers?: ShopOffer[]
  petCaptureAvailable?: boolean
  mutationTrigger?: 'battle' | 'insight' | 'rest'
  bossUnitSnapshot?: CombatUnit
  enemyUnitSnapshot?: CombatUnit
  teamUnitSnapshots?: CombatUnit[]
  /** Per-character comprehension growths from combat: characterId -> { techId -> growth } */
  comprehensionGrowth?: Record<string, Record<string, number>>
  /** Enemy template ID for codex tracking */
  enemyTemplateId?: string
  /** Equipment drops for codex tracking */
  equipmentCodexDiscoveries?: Array<{ setId: string; quality: ItemQuality }>
}

function getNonBossTemplates(dungeonId?: string): EnemyTemplate[] {
  if (dungeonId) return getEnemiesForDungeon(dungeonId)
  return getEnemiesForDungeon('')
}

function getAliveTeam(team: CombatUnit[]): CombatUnit[] {
  return team.filter((unit) => unit.hp > 0)
}

function totalTeamMaxHp(team: CombatUnit[]): number {
  return getAliveTeam(team).reduce((sum, unit) => sum + unit.maxHp, 0)
}

/** Build per-character comprehension growths from combat (+2 per technique per combat). */
function buildCombatComprehensionGrowth(team: CombatUnit[]): Record<string, Record<string, number>> {
  const characters = useSectStore.getState().sect.characters
  const growth: Record<string, Record<string, number>> = {}

  for (const unit of team) {
    const character = characters.find((c) => c.id === unit.id)
    if (!character || character.learnedTechniques.length === 0) continue

    const techGrowth: Record<string, number> = {}
    for (const techId of character.learnedTechniques) {
      const currentComp = character.techniqueComprehension?.[techId] ?? 0
      if (currentComp < 100) {
        techGrowth[techId] = Math.min(100 - currentComp, 2)
      }
    }
    if (Object.keys(techGrowth).length > 0) {
      growth[unit.id] = techGrowth
    }
  }

  return growth
}

function resolveLoot(loot: LootResult[]): {
  reward: Resources
  itemRewards: AnyItem[]
  hasPetCapture: boolean
  equipmentDiscoveries: Array<{ setId: string; quality: ItemQuality }>
} {
  const reward: Resources = { spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0 }
  const itemRewards: AnyItem[] = []
  let hasPetCapture = false
  const equipmentDiscoveries: Array<{ setId: string; quality: ItemQuality }> = []

  for (const drop of loot) {
    switch (drop.type) {
      case 'spiritStone':
        reward.spiritStone += drop.amount
        break
      case 'herb':
        reward.herb += drop.amount
        break
      case 'ore':
        reward.ore += drop.amount
        break
      case 'equipment': {
        if (!drop.quality) break
        const slot = EQUIP_SLOTS[Math.floor(Math.random() * EQUIP_SLOTS.length)]
        const equipment = generateEquipment(slot, drop.quality)
        if (equipment) {
          itemRewards.push(equipment)
          if (equipment.setId) {
            equipmentDiscoveries.push({ setId: equipment.setId, quality: equipment.quality })
          }
        }
        break
      }
      case 'consumable':
        break
      case 'petCapture':
        hasPetCapture = true
        break
    }
  }

  return { reward, itemRewards, hasPetCapture, equipmentDiscoveries }
}

function buildCombatTeam(team: CombatUnit[]): CombatUnit[] {
  return team.map((unit) => ({
    ...unit,
    affixes: unit.affixes ?? [],
    preset: unit.preset ?? 'balanced',
    aggro: unit.aggro ?? 0,
    shield: unit.shield ?? 0,
  }))
}

function buildHpChanges(originalTeam: CombatUnit[], allyHp: number[]): Record<string, number> {
  const hpChanges: Record<string, number> = {}
  for (let i = 0; i < originalTeam.length; i += 1) {
    const originalHp = originalTeam[i].hp
    const remainingHp = allyHp[i] ?? 0
    hpChanges[originalTeam[i].id] = -(originalHp - remainingHp)
  }
  return hpChanges
}

function makeNoTeamResult(type: DungeonEvent['type']): EventResult {
  return {
    type,
    success: false,
    reward: { spiritStone: 0, herb: 0, ore: 0 },
    itemRewards: [],
    message: '全军覆没，无法继续前进。',
    hpChanges: {},
  }
}

function createLegacyMaterialDrop(
  idPrefix: string,
  name: string,
  quality: ItemQuality,
  description: string,
  sellPrice: number
): AnyItem {
  return {
    id: `${idPrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    quality,
    type: 'material',
    description,
    sellPrice,
    category: 'other',
  }
}

function hasArchiveMilestone(id: string): boolean {
  return useSectStore.getState().sect.archiveMilestones.some((milestone) => milestone.id === id)
}

function resolveGuixuRandomEvent(team: CombatUnit[], floorNumber: number, roll: number): EventResult {
  const aliveTeam = getAliveTeam(team)
  const maxHp = totalTeamMaxHp(team)
  const emptyReward = { spiritStone: 0, herb: 0, ore: 0 }
  const hasLegacyPair = hasArchiveMilestone('legacyForgePair')

  if (roll < (hasLegacyPair ? 0.48 : 0.38)) {
    return {
      type: 'random',
      success: true,
      reward: {
        spiritStone: (hasLegacyPair ? 55 : 40) * floorNumber,
        herb: 0,
        ore: (hasLegacyPair ? 4 : 3) * floorNumber,
      },
      itemRewards: hasLegacyPair
        ? [
            createLegacyMaterialDrop(
              'guixu_tide_crystal_event',
              '归墟潮晶',
              'spirit',
              '裂隙回潮时凝成的异晶，可作为后续遗产锻造的引子。',
              180
            ),
            createLegacyMaterialDrop(
              'guixu_tide_crystal_event_bonus',
              '归墟潮晶',
              'spirit',
              '双遗共鸣后，裂隙回响会额外凝出一枚潮晶。',
              180
            ),
          ]
        : [
            createLegacyMaterialDrop(
              'guixu_tide_crystal_event',
              '归墟潮晶',
              'spirit',
              '裂隙回潮时凝成的异晶，可作为后续遗产锻造的引子。',
              180
            ),
          ],
      message: hasLegacyPair
        ? '双遗共鸣牵动归墟潮声，队伍顺势捞起了两枚归墟潮晶。'
        : '归墟潮声卷过断壁，队伍在回响中捞起了一枚归墟潮晶。',
      hpChanges: {},
      mutationTrigger: 'insight',
    }
  }

  if (roll < (hasLegacyPair ? 0.78 : 0.72)) {
    const healAmount = Math.floor(maxHp * 0.14)
    const perUnitHeal = aliveTeam.length > 0 ? Math.floor(healAmount / aliveTeam.length) : 0
    const hpChanges: Record<string, number> = {}
    for (const unit of aliveTeam) hpChanges[unit.id] = perUnitHeal
    return {
      type: 'random',
      success: true,
      reward: { spiritStone: 20 * floorNumber, herb: 0, ore: 0 },
      itemRewards: [],
      message: hasLegacyPair
        ? '双遗器在裂隙中短暂共鸣，渊壁灵潮被压稳，队伍得以从容调息。'
        : '渊壁间残存的灵潮短暂平息，队伍借机调息并收拢了一缕散逸灵息。',
      hpChanges,
      mutationTrigger: 'rest',
    }
  }

  if (roll < 0.9) {
    const hpChanges: Record<string, number> = {}
    for (const unit of aliveTeam) hpChanges[unit.id] = -Math.floor(unit.maxHp * 0.06)
    return {
      type: 'random',
      success: false,
      reward: { spiritStone: 25 * floorNumber, herb: 0, ore: 2 * floorNumber },
      itemRewards: [],
      message: hasLegacyPair
        ? '裂隙余波反卷而来，双遗器勉强稳住了阵脚，但队伍仍耗去一轮护体灵力。'
        : '裂隙余波反卷而来，虽强行收住战线，仍被逼得耗去一轮护体灵力。',
      hpChanges,
    }
  }

  const damageAmount = Math.floor(maxHp * 0.12)
  const perUnitDamage = aliveTeam.length > 0 ? Math.floor(damageAmount / aliveTeam.length) : 0
  const hpChanges: Record<string, number> = {}
  for (const unit of aliveTeam) hpChanges[unit.id] = -perUnitDamage
  return {
    type: 'random',
    success: false,
    reward: emptyReward,
    itemRewards: [],
    message: hasLegacyPair
      ? '归墟裂隙骤然塌陷，所幸双遗器先一步预警，队伍才勉强全身而退。'
      : '归墟裂隙骤然塌陷，队伍仓促退避，几乎被回潮吞没。',
    hpChanges,
  }
}

function resolveEnhancedGuixuRandomEvent(team: CombatUnit[], floorNumber: number, roll: number): EventResult {
  const hasLegacyTrinity = hasArchiveMilestone('legacyForgeTrinity')
  if (!hasLegacyTrinity) {
    return resolveGuixuRandomEvent(team, floorNumber, roll)
  }

  const aliveTeam = getAliveTeam(team)
  const maxHp = totalTeamMaxHp(team)

  if (roll < 0.56) {
    return {
      type: 'random',
      success: true,
      reward: { spiritStone: 72 * floorNumber, herb: 0, ore: 5 * floorNumber },
      itemRewards: [
        createLegacyMaterialDrop(
          'guixu_tide_crystal_event',
          '归墟潮晶',
          'spirit',
          '裂隙回潮时凝成的异晶，可作为后续遗产锻造的引子。',
          180
        ),
        createLegacyMaterialDrop(
          'guixu_tide_crystal_event_bonus',
          '归墟潮晶',
          'spirit',
          '双遗共鸣后，裂隙回响会额外凝出一枚潮晶。',
          180
        ),
        createLegacyMaterialDrop(
          'abyss_echo_shard_event_trinity',
          '渊息残片',
          'divine',
          '三遗齐鸣后，归墟更深处也会被拖拽出来，吐出新的残片。',
          420
        ),
      ],
      message: '三遗齐鸣牵动归墟回响，队伍不只捞起了潮晶，还从更深处带回了一枚渊息残片。',
      hpChanges: {},
      mutationTrigger: 'insight',
    }
  }

  if (roll < 0.84) {
    const healAmount = Math.floor(maxHp * 0.2)
    const perUnitHeal = aliveTeam.length > 0 ? Math.floor(healAmount / aliveTeam.length) : 0
    const hpChanges: Record<string, number> = {}
    for (const unit of aliveTeam) hpChanges[unit.id] = perUnitHeal
    return {
      type: 'random',
      success: true,
      reward: { spiritStone: 20 * floorNumber, herb: 0, ore: 0 },
      itemRewards: [],
      message: '三件遗器短暂稳住了裂隙灵潮，队伍不仅得以调息，还借势固住了一层护身界力。',
      hpChanges,
      mutationTrigger: 'rest',
    }
  }

  if (roll < 0.9) {
    const hpChanges: Record<string, number> = {}
    for (const unit of aliveTeam) hpChanges[unit.id] = -Math.floor(unit.maxHp * 0.06)
    return {
      type: 'random',
      success: false,
      reward: { spiritStone: 25 * floorNumber, herb: 0, ore: 2 * floorNumber },
      itemRewards: [],
      message: '裂隙余波反卷而来，三遗器勉强稳住了阵脚，队伍虽有损耗，但没有被乱潮冲散。',
      hpChanges,
    }
  }

  const damageAmount = Math.floor(maxHp * 0.12)
  const perUnitDamage = aliveTeam.length > 0 ? Math.floor(damageAmount / aliveTeam.length) : 0
  const hpChanges: Record<string, number> = {}
  for (const unit of aliveTeam) hpChanges[unit.id] = -perUnitDamage
  return {
    type: 'random',
    success: false,
    reward: { spiritStone: 0, herb: 0, ore: 0 },
    itemRewards: [],
    message: '归墟裂隙骤然塌陷，三遗器先一步预警，队伍才得以及时抽身而退。',
    hpChanges,
  }
}

function resolveGuixuAncientCaveEvent(floorNumber: number, techniqueId: string, techniqueName: string): EventResult {
  const hasLegacyPair = hasArchiveMilestone('legacyForgePair')
  const hasLegacyTrinity = hasArchiveMilestone('legacyForgeTrinity')

  if (hasLegacyTrinity) {
    return {
      type: 'ancient_cave',
      success: true,
      reward: { spiritStone: 120 * floorNumber, herb: 0, ore: 0 },
      itemRewards: [
        createLegacyMaterialDrop(
          'abyss_echo_shard_event',
          '渊息残片',
          'divine',
          '古修洞府深处震落的残片，仍残留着归墟最深处的低语。',
          420
        ),
        createLegacyMaterialDrop(
          'guixu_tide_crystal_cave_bonus',
          '归墟潮晶',
          'spirit',
          '双遗共鸣后，遗府中的潮痕也更容易凝成遗材。',
          180
        ),
        createLegacyMaterialDrop(
          'abyss_echo_shard_event_trinity_bonus',
          '渊息残片',
          'divine',
          '三遗齐鸣时，遗府深处会再返回一枚深层残片。',
          420
        ),
      ],
      message: `三遗齐鸣引动归墟遗府，队伍在参得 ${techniqueName} 残痕的同时，不只带回潮晶，还多捞出了一枚深层残片。`,
      hpChanges: {},
      techniqueReward: { techniqueId },
      mutationTrigger: 'insight',
    }
  }

  if (hasLegacyPair) {
    return {
      type: 'ancient_cave',
      success: true,
      reward: { spiritStone: 90 * floorNumber, herb: 0, ore: 0 },
      itemRewards: [
        createLegacyMaterialDrop(
          'abyss_echo_shard_event',
          '渊息残片',
          'divine',
          '古修洞府深处震落的残片，仍残留着归墟最深处的低语。',
          420
        ),
        createLegacyMaterialDrop(
          'guixu_tide_crystal_cave_bonus',
          '归墟潮晶',
          'spirit',
          '双遗共鸣后，遗府中的潮痕也更容易凝成遗材。',
          180
        ),
      ],
      message: `双遗共鸣引动归墟遗府，队伍在参得 ${techniqueName} 残痕的同时又收拢了一枚归墟潮晶。`,
      hpChanges: {},
      techniqueReward: { techniqueId },
      mutationTrigger: 'insight',
    }
  }

  return {
    type: 'ancient_cave',
    success: true,
    reward: { spiritStone: 60 * floorNumber, herb: 0, ore: 0 },
    itemRewards: [
      createLegacyMaterialDrop(
        'abyss_echo_shard_event',
        '渊息残片',
        'divine',
        '古修洞府深处震落的残片，仍残留着归墟最深处的低语。',
        420
      ),
    ],
    message: `在归墟遗府中参得 ${techniqueName} 的残痕，并取回了一枚渊息残片。`,
    hpChanges: {},
    techniqueReward: { techniqueId },
    mutationTrigger: 'insight',
  }
}

export function resolveEvent(
  event: DungeonEvent,
  team: CombatUnit[],
  floorNumber: number,
  teamFortune?: number,
  dungeonId?: string
): EventResult {
  const emptyReward = { spiritStone: 0, herb: 0, ore: 0 }

  switch (event.type) {
    case 'combat': {
      const aliveTeam = getAliveTeam(team)
      if (aliveTeam.length === 0) return makeNoTeamResult('combat')

      const templates = getNonBossTemplates(dungeonId)
      const enemyTemplate = templates[Math.floor(Math.random() * templates.length)] as EnemyTemplate
      const enemyUnit = createCombatUnitFromEnemy(enemyTemplate, floorNumber)
      const enemySnapshot: CombatUnit = { ...enemyUnit, affixes: [...(enemyUnit.affixes ?? [])] }

      // Adjust enemy difficulty based on team power (±20%)
      adjustEnemyByTeamPower(enemyUnit, aliveTeam, { floor: floorNumber })

      if (hasAffix(enemyUnit.affixes, 'shield')) {
        enemyUnit.shield = calcShield(enemyUnit.maxHp, true)
      }

      const result = simulateCombat(buildCombatTeam(aliveTeam), [enemyUnit])
      const hpChanges = buildHpChanges(aliveTeam, result.allyHp)

      if (!result.victory) {
        return {
          type: 'combat',
          success: false,
          reward: emptyReward,
          itemRewards: [],
          combatResult: result,
          message: `败给了${enemyTemplate.name}。`,
          hpChanges,
          enemyUnitSnapshot: enemySnapshot,
          teamUnitSnapshots: aliveTeam.map((u) => ({ ...u })),
          enemyTemplateId: enemyTemplate.id,
        }
      }

      const loot = generateLoot(enemyTemplate.lootTable, enemyTemplate.dropsPerFight, floorNumber)
      const { reward, itemRewards, hasPetCapture, equipmentDiscoveries } = resolveLoot(loot)
      return {
        type: 'combat',
        success: true,
        reward,
        itemRewards,
        combatResult: result,
        message: hasPetCapture
          ? `击败了${enemyTemplate.name}，发现一只可驯服的灵兽。`
          : `击败了${enemyTemplate.name}。`,
        hpChanges,
        petCaptureAvailable: hasPetCapture || undefined,
        mutationTrigger: 'battle',
        comprehensionGrowth: buildCombatComprehensionGrowth(aliveTeam),
        enemyUnitSnapshot: enemySnapshot,
        teamUnitSnapshots: aliveTeam.map((u) => ({ ...u })),
        enemyTemplateId: enemyTemplate.id,
        equipmentCodexDiscoveries: equipmentDiscoveries.length > 0 ? equipmentDiscoveries : undefined,
      }
    }

    case 'random': {
      const aliveTeam = getAliveTeam(team)
      const maxHp = totalTeamMaxHp(team)
      const roll = Math.random()

      if (dungeonId === 'guixuRift') {
        return resolveEnhancedGuixuRandomEvent(team, floorNumber, roll)
      }

      // Fortune-adjusted probabilities:
      // Base: treasure 50%, rest 30%, trap 20%
      // fortune > 50: treasure +15%, trap -10%
      // fortune < 30: trap +10%, treasure -10%
      // Linear interpolation between thresholds
      let treasureThreshold = 0.5
      let trapBase = 0.8 // trap starts here (rest was 0.5-0.8)

      if (teamFortune !== undefined) {
        if (teamFortune > 50) {
          const factor = Math.min((teamFortune - 50) / 50, 1) // 0-1 range
          treasureThreshold += 0.15 * factor
          trapBase += 0.1 * factor // trap region shrinks by shifting trapBase up
        } else if (teamFortune < 30) {
          const factor = Math.min((30 - teamFortune) / 30, 1) // 0-1 range
          treasureThreshold -= 0.1 * factor
          trapBase -= 0.1 * factor // trap region grows by shifting trapBase down
        }
      }

      if (roll < treasureThreshold) {
        return {
          type: 'random',
          success: true,
          reward: { spiritStone: 30 * floorNumber, herb: 2 * floorNumber, ore: 0 },
          itemRewards: [],
          message: '发现了一处宝箱！',
          hpChanges: {},
          mutationTrigger: 'insight',
        }
      }

      if (roll < trapBase) {
        const healAmount = Math.floor(maxHp * 0.1)
        const perUnitHeal = aliveTeam.length > 0 ? Math.floor(healAmount / aliveTeam.length) : 0
        const hpChanges: Record<string, number> = {}
        for (const unit of aliveTeam) hpChanges[unit.id] = perUnitHeal
        return {
          type: 'random',
          success: true,
          reward: emptyReward,
          itemRewards: [],
          message: '路边休息，恢复了少量生命',
          hpChanges,
          mutationTrigger: 'rest',
        }
      }

      const damageAmount = Math.floor(maxHp * 0.1)
      const perUnitDamage = aliveTeam.length > 0 ? Math.floor(damageAmount / aliveTeam.length) : 0
      const hpChanges: Record<string, number> = {}
      for (const unit of aliveTeam) hpChanges[unit.id] = -perUnitDamage
      return {
        type: 'random',
        success: false,
        reward: emptyReward,
        itemRewards: [],
        message: '踩到了陷阱！',
        hpChanges,
      }
    }

    case 'shop': {
      const offers = [...SHOP_ITEMS].sort(() => Math.random() - 0.5).slice(0, 2)
      return {
        type: 'shop',
        success: true,
        reward: emptyReward,
        itemRewards: [],
        message: '路遇一位游方商人，摆出了几件货物。',
        hpChanges: {},
        shopOffers: offers,
      }
    }

    case 'rest': {
      const aliveTeam = getAliveTeam(team)
      const maxHp = totalTeamMaxHp(team)
      const healTotal = Math.floor(maxHp * 0.3)
      const perUnitHeal = aliveTeam.length > 0 ? Math.floor(healTotal / aliveTeam.length) : 0
      const hpChanges: Record<string, number> = {}
      for (const unit of aliveTeam) hpChanges[unit.id] = perUnitHeal
      return {
        type: 'rest',
        success: true,
        reward: emptyReward,
        itemRewards: [],
        message: '在安全地带休息，恢复了状态',
        hpChanges,
        mutationTrigger: 'rest',
      }
    }

    case 'boss': {
      const aliveTeam = getAliveTeam(team)
      if (aliveTeam.length === 0) return makeNoTeamResult('boss')

      const bossTemplate = dungeonId ? getBossForDungeon(dungeonId) : getBossForDungeon('')
      const bossUnit = createCombatUnitFromEnemy(bossTemplate, floorNumber)

      // Apply 2.5x boss base scaling on top of layer-scaled stats
      const bossScaled = scaleBossStats({
        hp: bossUnit.maxHp,
        atk: bossUnit.atk,
        def: bossUnit.def,
        spd: bossUnit.spd,
      })
      bossUnit.hp = bossScaled.hp
      bossUnit.maxHp = bossScaled.hp
      bossUnit.atk = bossScaled.atk
      bossUnit.def = bossScaled.def
      bossUnit.spd = bossScaled.spd

      // Then apply +/-20% team power adjustment
      adjustEnemyByTeamPower(bossUnit, aliveTeam, { isBoss: true, floor: floorNumber })

      if (hasAffix(bossUnit.affixes, 'shield')) {
        bossUnit.shield = calcShield(bossUnit.maxHp, true)
      }

      // Snapshot boss and team before combat for report
      const bossSnapshot: CombatUnit = { ...bossUnit, affixes: [...(bossUnit.affixes ?? [])] }
      const teamSnapshots: CombatUnit[] = aliveTeam.map((u) => ({ ...u, affixes: [...(u.affixes ?? [])] }))

      const result = simulateCombat(buildCombatTeam(aliveTeam), [bossUnit])
      const hpChanges = buildHpChanges(aliveTeam, result.allyHp)

      if (!result.victory) {
        return {
          type: 'boss',
          success: false,
          reward: { spiritStone: 50 * floorNumber, herb: 2 * floorNumber, ore: 0 },
          itemRewards: [],
          combatResult: result,
          message: `败给了秘境守关者：${bossTemplate.name}。`,
          hpChanges,
          bossUnitSnapshot: bossSnapshot,
          teamUnitSnapshots: teamSnapshots,
          enemyTemplateId: bossTemplate.id,
        }
      }

      const loot = generateLoot(bossTemplate.lootTable, bossTemplate.dropsPerFight, floorNumber)
      const { reward, itemRewards, hasPetCapture, equipmentDiscoveries } = resolveLoot(loot)
      return {
        type: 'boss',
        success: true,
        reward,
        itemRewards,
        combatResult: result,
        message: hasPetCapture
          ? `击败了秘境守关者：${bossTemplate.name}，发现一只可驯服的灵兽。`
          : `击败了秘境守关者：${bossTemplate.name}。`,
        hpChanges,
        petCaptureAvailable: hasPetCapture || undefined,
        mutationTrigger: 'battle',
        bossUnitSnapshot: bossSnapshot,
        teamUnitSnapshots: teamSnapshots,
        comprehensionGrowth: buildCombatComprehensionGrowth(aliveTeam),
        enemyTemplateId: bossTemplate.id,
        equipmentCodexDiscoveries: equipmentDiscoveries.length > 0 ? equipmentDiscoveries : undefined,
      }
    }

    case 'ancient_cave': {
      const techniqueId = pickTechniqueForFloor(floorNumber)
      const techniqueName = getTechniqueById(techniqueId)?.name ?? techniqueId
      if (dungeonId === 'guixuRift') {
        return resolveGuixuAncientCaveEvent(floorNumber, techniqueId, techniqueName)
        const hasLegacyPair = hasArchiveMilestone('legacyForgePair')
        return {
          type: event.type,
          success: true,
          reward: { spiritStone: (hasLegacyPair ? 90 : 60) * floorNumber, herb: 0, ore: 0 },
          itemRewards: hasLegacyPair
            ? [
                createLegacyMaterialDrop(
                  'abyss_echo_shard_event',
                  '渊息残片',
                  'divine',
                  '古修洞府深处震落的残片，仍残留着归墟最深处的低语。',
                  420
                ),
                createLegacyMaterialDrop(
                  'guixu_tide_crystal_cave_bonus',
                  '归墟潮晶',
                  'spirit',
                  '双遗共鸣后，遗府中的潮痕也更容易凝成遗材。',
                  180
                ),
              ]
            : [
                createLegacyMaterialDrop(
                  'abyss_echo_shard_event',
                  '渊息残片',
                  'divine',
                  '古修洞府深处震落的残片，仍残留着归墟最深处的低语。',
                  420
                ),
              ],
          message: hasLegacyPair
            ? `双遗共鸣引动归墟遗府，队伍在参得 ${techniqueName} 残痕的同时又收拢了一枚归墟潮晶。`
            : `在归墟遗府中参得 ${techniqueName} 的残痕，并取回了一枚渊息残片。`,
          hpChanges: {},
          techniqueReward: { techniqueId },
          mutationTrigger: 'insight',
        }
      }
      return {
        type: event.type,
        success: true,
        reward: { spiritStone: 0, herb: 0, ore: 0 },
        itemRewards: [],
        message: `在古修洞府中发现功法：${techniqueName}`,
        hpChanges: {},
        techniqueReward: { techniqueId },
        mutationTrigger: 'insight',
      }
    }

    default:
      return {
        type: event.type,
        success: false,
        reward: emptyReward,
        itemRewards: [],
        message: 'Unknown event.',
        hpChanges: {},
      }
  }
}
