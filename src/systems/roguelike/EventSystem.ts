// src/systems/roguelike/EventSystem.ts
import type { DungeonEvent } from '../../types/adventure'
import type { AnyItem } from '../../types/item'
import { ENEMY_TEMPLATES, createCombatUnitFromEnemy, type EnemyTemplate } from '../../data/enemies'
import type { CombatUnit, CombatResult } from '../combat/CombatEngine'
import type { TacticPreset } from '../../types/runBuild'
import { pickTechniqueForFloor } from '../technique/TechniqueSystem'
import { getTechniqueById } from '../../data/techniquesTable'
import { simulateCombat } from '../combat/CombatEngine'
import { generateEquipment } from '../item/ItemGenerator'
import { generateLoot } from './LootSystem'
import type { LootResult } from './LootSystem'
import { EQUIP_SLOTS } from '../../data/items'
import type { Resources } from '../../types/sect'

export interface ShopOffer {
  name: string
  description: string
  cost: number
  effect: 'heal' | 'skip'
  value: number
}

const SHOP_ITEMS: ShopOffer[] = [
  { name: '回春丹', description: '恢复 30% 生命', cost: 100, effect: 'heal', value: 0.3 },
  { name: '传送符', description: '跳过当前层', cost: 200, effect: 'skip', value: 0 },
]

export interface EventResult {
  type: DungeonEvent['type']
  success: boolean
  reward: { spiritStone: number; herb: number; ore: number }
  itemRewards: AnyItem[]
  combatResult?: CombatResult
  message: string
  hpChanges: Record<string, number> // unit id -> hp change (positive = healed, negative = damage)
  techniqueReward?: { techniqueId: string }
  shopOffers?: ShopOffer[]
  petCaptureAvailable?: boolean
}

function getNonBossTemplates() {
  return ENEMY_TEMPLATES.filter((e) => !e.isBoss)
}

/**
 * Get alive units from the team for combat.
 * Dead allies are skipped in subsequent floors.
 */
function getAliveTeam(team: CombatUnit[]): CombatUnit[] {
  return team.filter(u => u.hp > 0)
}

/**
 * Sum total max HP across all alive team members.
 */
function totalTeamMaxHp(team: CombatUnit[]): number {
  return getAliveTeam(team).reduce((sum, u) => sum + u.maxHp, 0)
}

/**
 * Resolve loot results into resource rewards and item rewards.
 * Resources go to sect.resources, items go to vault via ItemStack.
 */
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
      case 'equipment':
        if (drop.quality) {
          const slot = EQUIP_SLOTS[Math.floor(Math.random() * EQUIP_SLOTS.length)]
          itemRewards.push(generateEquipment(slot, drop.quality))
        }
        break
      case 'consumable':
        // Handled by caller
        break
      case 'petCapture':
        hasPetCapture = true
        break
    }
  }

  return { reward, itemRewards, hasPetCapture }
}

/**
 * Resolve an event with a team of combat units (multi-unit support).
 *
 * Dead allies are filtered out before combat and non-combat events.
 * Returns rewards (resources + items) without mutating any store.
 */
export function resolveEvent(
  event: DungeonEvent,
  team: CombatUnit[],
  floorNumber: number,
  tacticPreset: TacticPreset = 'balanced',
): EventResult {
  const emptyReward = { spiritStone: 0, herb: 0, ore: 0 }

  switch (event.type) {
    case 'combat': {
      const aliveTeam = getAliveTeam(team)
      if (aliveTeam.length === 0) {
        return {
          type: 'combat',
          success: false,
          reward: emptyReward,
          itemRewards: [],
          message: '队伍已全军覆没...',
          hpChanges: {},
        }
      }
      const templates = getNonBossTemplates()
      const enemyTemplate = templates[Math.floor(Math.random() * templates.length)] as EnemyTemplate
      const enemyUnit = createCombatUnitFromEnemy(enemyTemplate, floorNumber)
      const result = simulateCombat(aliveTeam, [enemyUnit], tacticPreset)
      const victory = result.victory

      // Calculate HP changes for each alive team member
      const hpChanges: Record<string, number> = {}
      for (let i = 0; i < aliveTeam.length; i++) {
        const original = aliveTeam[i].hp
        const remaining = result.allyHp[i] ?? 0
        hpChanges[aliveTeam[i].id] = -(original - remaining)
      }

      if (victory) {
        const loot = generateLoot(enemyTemplate.lootTable, enemyTemplate.dropsPerFight, floorNumber)
        const { reward, itemRewards, hasPetCapture } = resolveLoot(loot)
        return {
          type: 'combat',
          success: true,
          reward,
          itemRewards,
          combatResult: result,
          message: hasPetCapture ? `击败了 ${enemyTemplate.name}，发现可捕获灵兽！` : `击败了 ${enemyTemplate.name}`,
          hpChanges,
          petCaptureAvailable: hasPetCapture || undefined,
        }
      } else {
        return {
          type: 'combat',
          success: false,
          reward: emptyReward,
          itemRewards: [],
          combatResult: result,
          message: `被 ${enemyTemplate.name} 击败`,
          hpChanges,
        }
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
        }
      } else if (roll < 0.8) {
        // Heal all alive team members
        const healAmount = Math.floor(maxHp * 0.1)
        const perUnitHeal = aliveTeam.length > 0 ? Math.floor(healAmount / aliveTeam.length) : 0
        const hpChanges: Record<string, number> = {}
        for (const unit of aliveTeam) {
          hpChanges[unit.id] = perUnitHeal
        }
        return {
          type: 'random',
          success: true,
          reward: emptyReward,
          itemRewards: [],
          message: '路边休息，恢复了少量生命',
          hpChanges,
        }
      } else {
        // Damage all alive team members
        const damageAmount = Math.floor(maxHp * 0.1)
        const perUnitDamage = aliveTeam.length > 0 ? Math.floor(damageAmount / aliveTeam.length) : 0
        const hpChanges: Record<string, number> = {}
        for (const unit of aliveTeam) {
          hpChanges[unit.id] = -perUnitDamage
        }
        return {
          type: 'random',
          success: false,
          reward: emptyReward,
          itemRewards: [],
          message: '踩到了陷阱！',
          hpChanges,
        }
      }
    }
    case 'shop': {
      const shuffled = [...SHOP_ITEMS].sort(() => Math.random() - 0.5)
      const offers = shuffled.slice(0, 2)
      return {
        type: 'shop',
        success: true,
        reward: emptyReward,
        itemRewards: [],
        message: '遇到了游商',
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
      for (const unit of aliveTeam) {
        hpChanges[unit.id] = perUnitHeal
      }
      return {
        type: 'rest',
        success: true,
        reward: emptyReward,
        itemRewards: [],
        message: '休息恢复了生命',
        hpChanges,
      }
    }
    case 'boss': {
      const aliveTeam = getAliveTeam(team)
      if (aliveTeam.length === 0) {
        return {
          type: 'boss',
          success: false,
          reward: emptyReward,
          itemRewards: [],
          message: '队伍已全军覆没...',
          hpChanges: {},
        }
      }
      const bossTemplate = ENEMY_TEMPLATES.find((e) => e.isBoss) as EnemyTemplate
      const bossUnit = createCombatUnitFromEnemy(bossTemplate, floorNumber)
      // Boost boss for boss fight
      bossUnit.hp = Math.floor(bossUnit.hp * 2)
      bossUnit.maxHp = bossUnit.hp
      bossUnit.atk = Math.floor(bossUnit.atk * 1.5)
      const result = simulateCombat(aliveTeam, [bossUnit], tacticPreset)
      const victory = result.victory

      // Calculate HP changes for each alive team member
      const hpChanges: Record<string, number> = {}
      for (let i = 0; i < aliveTeam.length; i++) {
        const original = aliveTeam[i].hp
        const remaining = result.allyHp[i] ?? 0
        hpChanges[aliveTeam[i].id] = -(original - remaining)
      }

      if (victory) {
        const loot = generateLoot(bossTemplate.lootTable, bossTemplate.dropsPerFight, floorNumber)
        const { reward, itemRewards, hasPetCapture } = resolveLoot(loot)
        return {
          type: 'boss',
          success: true,
          reward,
          itemRewards,
          combatResult: result,
          message: hasPetCapture ? `击败了 BOSS: ${bossTemplate.name}！发现可捕获灵兽！` : `击败了 BOSS: ${bossTemplate.name}！`,
          hpChanges,
          petCaptureAvailable: hasPetCapture || undefined,
        }
      } else {
        return {
          type: 'boss',
          success: false,
          reward: { spiritStone: 50 * floorNumber, herb: 2 * floorNumber, ore: 0 },
          itemRewards: [],
          combatResult: result,
          message: `被 BOSS: ${bossTemplate.name} 击败...`,
          hpChanges,
        }
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
        message: `古修洞府中发现功法铭文：${techniqueName}`,
        hpChanges: {},
        techniqueReward: { techniqueId },
      }
    }
    default:
      return {
        type: event.type,
        success: false,
        reward: emptyReward,
        itemRewards: [],
        message: '未知事件',
        hpChanges: {},
      }
  }
}
