import type { Enemy } from '../types/adventure'
import type { CombatUnit } from '../systems/combat/CombatEngine'
import type { Character } from '../types/character'
import { TECHNIQUE_TIER_ORDER } from '../types/technique'
import { getTechniqueById } from './techniquesTable'
import type { ActiveSkill } from '../types/skill'
import { getActiveSkillById } from './activeSkills'

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

/**
 * Create a combat unit from a Character and their learned techniques.
 *
 * Steps:
 * 1. Start with character.baseStats
 * 2. Sum bonuses from all learned techniques (flat additive)
 * 3. Use character.cultivationStats.spiritPower/maxSpiritPower
 * 4. Resolve equippedSkills to ActiveSkill objects
 * 5. Use highest tier technique's element, or 'neutral' if no techniques
 */
export function createCharacterCombatUnit(
  character: Character,
  learnedTechniques: string[],
): CombatUnit {
  const base = character.baseStats

  let hp = base.hp
  let atk = base.atk
  let def = base.def
  let spd = base.spd
  let crit = base.crit
  let critDmg = base.critDmg

  // Collect bonuses from all techniques
  let highestTierIdx = -1
  let element: string = 'neutral'

  for (const techId of learnedTechniques) {
    const technique = getTechniqueById(techId)
    if (!technique) continue

    // Track highest tier for element
    const tierIdx = TECHNIQUE_TIER_ORDER.indexOf(technique.tier)
    if (tierIdx > highestTierIdx) {
      highestTierIdx = tierIdx
      element = technique.element
    }

    // Sum bonuses
    for (const bonus of technique.bonuses) {
      switch (bonus.type) {
        case 'hp': hp += bonus.value; break
        case 'atk': atk += bonus.value; break
        case 'def': def += bonus.value; break
        case 'spd': spd += bonus.value; break
        case 'crit': crit = Math.round((crit + bonus.value) * 10000) / 10000; break
        case 'critDmg': critDmg = Math.round((critDmg + bonus.value) * 100) / 100; break
        // cultivationRate and other non-stat bonuses are handled elsewhere
      }
    }
  }

  const skills = resolveSkills(character.equippedSkills)

  return {
    id: character.id,
    name: character.name,
    team: 'ally',
    hp,
    maxHp: hp,
    atk,
    def,
    spd,
    crit,
    critDmg,
    element,
    spiritPower: character.cultivationStats.spiritPower,
    maxSpiritPower: character.cultivationStats.maxSpiritPower,
    skills,
    skillCooldowns: new Array(skills.length).fill(0),
  }
}

/**
 * Resolve equipped skill IDs to ActiveSkill objects, filtering out nulls and unknowns.
 */
function resolveSkills(equippedSkills: (string | null)[]): ActiveSkill[] {
  const skills: ActiveSkill[] = []
  for (const skillId of equippedSkills) {
    if (!skillId) continue
    const skill = getActiveSkillById(skillId)
    if (skill) skills.push(skill)
  }
  return skills
}

// ─── Backward-compatible alias ───────────────────────────────────────
// TODO: Remove once all call sites are migrated to createCharacterCombatUnit

/** @deprecated Use createCharacterCombatUnit instead */
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
    element: 'neutral',
    spiritPower: player.spiritPower ?? 50,
    maxSpiritPower: player.maxSpiritPower ?? 50,
    skills: player.skills ?? [],
    skillCooldowns: new Array((player.skills ?? []).length).fill(0),
  }
}
