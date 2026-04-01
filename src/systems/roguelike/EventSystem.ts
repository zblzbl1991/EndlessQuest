import type { DungeonEvent } from '../../types/adventure'
import type { AnyItem } from '../../types/item'
import { ENEMY_TEMPLATES, createCombatUnitFromEnemy, type EnemyTemplate } from '../../data/enemies'
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

export function resolveEvent(event: DungeonEvent, team: CombatUnit[], floorNumber: number): EventResult {
  const emptyReward = { spiritStone: 0, herb: 0, ore: 0 }

  switch (event.type) {
    case 'combat': {
      const aliveTeam = getAliveTeam(team)
      if (aliveTeam.length === 0) return makeNoTeamResult('combat')

      const templates = getNonBossTemplates()
      const enemyTemplate = templates[Math.floor(Math.random() * templates.length)] as EnemyTemplate
      const enemyUnit = createCombatUnitFromEnemy(enemyTemplate, floorNumber)

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
          message: `Lost to ${enemyTemplate.name}.`,
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
          ? `Defeated ${enemyTemplate.name} and found a tameable beast.`
          : `Defeated ${enemyTemplate.name}.`,
        hpChanges,
        petCaptureAvailable: hasPetCapture || undefined,
        mutationTrigger: 'battle',
      }
    }

    case 'random': {
      const aliveTeam = getAliveTeam(team)
      const maxHp = totalTeamMaxHp(team)
      const roll = Math.random()

      if (roll < 0.5) {
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

      if (roll < 0.8) {
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
        message: 'Encountered a wandering merchant.',
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
      bossUnit.hp = Math.floor(bossUnit.hp * 2)
      bossUnit.maxHp = bossUnit.hp
      bossUnit.atk = Math.floor(bossUnit.atk * 1.5)

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
          message: `Lost to BOSS: ${bossTemplate.name}.`,
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
          ? `Defeated BOSS: ${bossTemplate.name} and found a tameable beast.`
          : `Defeated BOSS: ${bossTemplate.name}.`,
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
        message: `Ancient cave manual discovered: ${techniqueName}`,
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
