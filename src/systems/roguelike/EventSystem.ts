import type { DungeonEvent } from '../../types/adventure'
import type { AnyItem } from '../../types/item'
import {
  ENEMY_TEMPLATES,
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
import { pickTechniqueForFloor } from '../technique/TechniqueSystem'
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
}

function getNonBossTemplates(): EnemyTemplate[] {
  return ENEMY_TEMPLATES.filter((enemy) => !enemy.isBoss)
}

function getAliveTeam(team: CombatUnit[]): CombatUnit[] {
  return team.filter((unit) => unit.hp > 0)
}

function totalTeamMaxHp(team: CombatUnit[]): number {
  return getAliveTeam(team).reduce((sum, unit) => sum + unit.maxHp, 0)
}

function resolveLoot(loot: LootResult[]): { reward: Resources; itemRewards: AnyItem[]; hasPetCapture: boolean } {
  const reward: Resources = { spiritStone: 0, spiritEnergy: 0, herb: 0, ore: 0 }
  const itemRewards: AnyItem[] = []
  let hasPetCapture = false

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
        if (equipment) itemRewards.push(equipment)
        break
      }
      case 'consumable':
        break
      case 'petCapture':
        hasPetCapture = true
        break
    }
  }

  return { reward, itemRewards, hasPetCapture }
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

export function resolveEvent(
  event: DungeonEvent,
  team: CombatUnit[],
  floorNumber: number,
  teamFortune?: number
): EventResult {
  const emptyReward = { spiritStone: 0, herb: 0, ore: 0 }

  switch (event.type) {
    case 'combat': {
      const aliveTeam = getAliveTeam(team)
      if (aliveTeam.length === 0) return makeNoTeamResult('combat')

      const templates = getNonBossTemplates()
      const enemyTemplate = templates[Math.floor(Math.random() * templates.length)] as EnemyTemplate
      const enemyUnit = createCombatUnitFromEnemy(enemyTemplate, floorNumber)

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
        }
      }

      const loot = generateLoot(enemyTemplate.lootTable, enemyTemplate.dropsPerFight, floorNumber)
      const { reward, itemRewards, hasPetCapture } = resolveLoot(loot)
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
      }
    }

    case 'random': {
      const aliveTeam = getAliveTeam(team)
      const maxHp = totalTeamMaxHp(team)
      const roll = Math.random()

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

      const bossTemplate = ENEMY_TEMPLATES.find((enemy) => enemy.isBoss) as EnemyTemplate
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
        }
      }

      const loot = generateLoot(bossTemplate.lootTable, bossTemplate.dropsPerFight, floorNumber)
      const { reward, itemRewards, hasPetCapture } = resolveLoot(loot)
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
      }
    }

    case 'ancient_cave': {
      const techniqueId = pickTechniqueForFloor(floorNumber)
      const techniqueName = getTechniqueById(techniqueId)?.name ?? techniqueId
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
