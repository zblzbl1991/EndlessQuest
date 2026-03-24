import type { Enemy } from '../types/adventure'
import type { CombatUnit } from '../systems/combat/CombatEngine'

export const ENEMY_TEMPLATES: Enemy[] = [
  { id: 'wild_spirit_beast', name: '灵兽', element: 'neutral', stats: { hp: 50, atk: 8, def: 4, spd: 6 }, isBoss: false },
  { id: 'cave_demon', name: '洞妖', element: 'fire', stats: { hp: 120, atk: 18, def: 10, spd: 8 }, isBoss: false },
  { id: 'spirit_boss', name: '灵脉守卫', element: 'lightning', stats: { hp: 500, atk: 40, def: 25, spd: 12 }, isBoss: true },
]

export function scaleEnemy(baseStats: { hp: number; atk: number; def: number; spd: number }, layer: number) {
  const mult = 1 + 0.08 * layer
  return {
    hp: Math.floor(baseStats.hp * mult),
    atk: Math.floor(baseStats.atk * mult),
    def: Math.floor(baseStats.def * mult),
    spd: Math.floor(baseStats.spd * mult),
  }
}

export function createCombatUnitFromEnemy(enemy: Enemy, layer: number): CombatUnit {
  const scaled = scaleEnemy(enemy.stats, layer)
  return {
    id: enemy.id,
    name: enemy.name,
    team: 'enemy',
    hp: scaled.hp,
    maxHp: scaled.hp,
    atk: scaled.atk,
    def: scaled.def,
    spd: scaled.spd,
    crit: 0.05,
    critDmg: 1.5,
    element: enemy.element,
    spiritPower: 30,
    maxSpiritPower: 30,
    skills: [],
    skillCooldowns: [],
  }
}

export function createPlayerCombatUnit(player: {
  id: string
  name: string
  baseStats: { hp: number; atk: number; def: number; spd: number; crit: number; critDmg: number }
  totalHp?: number
  totalAtk?: number
  totalDef?: number
  totalSpd?: number
  totalCrit?: number
  totalCritDmg?: number
  skills?: any[]
  spiritPower?: number
  maxSpiritPower?: number
}): CombatUnit {
  return {
    id: player.id,
    name: player.name,
    team: 'ally',
    hp: player.totalHp ?? player.baseStats.hp,
    maxHp: player.totalHp ?? player.baseStats.hp,
    atk: player.totalAtk ?? player.baseStats.atk,
    def: player.totalDef ?? player.baseStats.def,
    spd: player.totalSpd ?? player.baseStats.spd,
    crit: player.totalCrit ?? player.baseStats.crit,
    critDmg: player.totalCritDmg ?? player.baseStats.critDmg,
    element: 'lightning',
    spiritPower: player.spiritPower ?? 50,
    maxSpiritPower: player.maxSpiritPower ?? 50,
    skills: player.skills ?? [],
    skillCooldowns: new Array((player.skills ?? []).length).fill(0),
  }
}
