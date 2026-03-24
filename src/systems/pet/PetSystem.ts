import type { ActiveSkill } from '../../types/skill'

export type PetQuality = 'common' | 'spirit' | 'immortal' | 'divine'

export interface PetSkill {
  id: string
  name: string
  multiplier: number
  element: string
  description: string
}

export interface Pet {
  id: string
  name: string
  quality: PetQuality
  element: string
  level: number
  talent: number
  innateSkill: PetSkill
  equippedSkills: (PetSkill | null)[]
  stats: { hp: number; atk: number; def: number; spd: number }
}

export const PET_QUALITY_STAT_MULT: Record<PetQuality, number> = {
  common: 0.3,
  spirit: 0.5,
  immortal: 0.7,
  divine: 1.0,
}

export const PET_QUALITY_MAX_LEVEL: Record<PetQuality, number> = {
  common: 20,
  spirit: 40,
  immortal: 60,
  divine: 80,
}

export const PET_QUALITY_NAMES: Record<PetQuality, string> = {
  common: '\u51e1\u54c1',
  spirit: '\u7075\u54c1',
  immortal: '\u4ed9\u54c1',
  divine: '\u795e\u54c1',
}

export const PET_INNATE_SKILLS: PetSkill[] = [
  { id: 'claw', name: '\u5229\u722a', multiplier: 1.2, element: 'neutral', description: '\u5229\u722a\u653b\u51fb' },
  { id: 'bite', name: '\u6495\u54ac', multiplier: 1.4, element: 'fire', description: '\u70c8\u7130\u6495\u54ac' },
  { id: 'roar', name: '\u6012\u543c', multiplier: 1.0, element: 'ice', description: '\u5bd2\u51b0\u6012\u543c' },
  { id: 'bolt', name: '\u96f7\u7535', multiplier: 1.6, element: 'lightning', description: '\u96f7\u7535\u4e4b\u51fb' },
]

let _petIdCounter = 0

export function generatePet(quality: PetQuality): Pet {
  const id = `pet_${Date.now()}_${++_petIdCounter}`
  const mult = PET_QUALITY_STAT_MULT[quality]
  const talent = Math.floor(Math.random() * 50) + 30

  const baseStats = {
    hp: Math.floor(30 * mult * (1 + talent / 200)),
    atk: Math.floor(5 * mult * (1 + talent / 200)),
    def: Math.floor(3 * mult * (1 + talent / 200)),
    spd: Math.floor(4 * mult * (1 + talent / 200)),
  }

  const elements = ['fire', 'ice', 'lightning', 'neutral']
  const innate = PET_INNATE_SKILLS[Math.floor(Math.random() * PET_INNATE_SKILLS.length)]

  const names = [
    '\u5c0f\u706b\u72d0', '\u51b0\u6676\u5154', '\u96f7\u9e70', '\u7075\u9e7f',
    '\u7389\u87fe', '\u98ce\u72fc', '\u4e91\u9e64', '\u7384\u9f9f',
  ]
  const qualityPrefix =
    quality === 'common' ? '' :
    quality === 'spirit' ? '\u7075' :
    quality === 'immortal' ? '\u4ed9' :
    '\u795e'

  return {
    id,
    name: qualityPrefix + names[Math.floor(Math.random() * names.length)],
    quality,
    element: elements[Math.floor(Math.random() * elements.length)],
    level: 1,
    talent,
    innateSkill: innate,
    equippedSkills: [null, null],
    stats: baseStats,
  }
}

export function feedPet(pet: Pet): Pet {
  if (pet.level >= PET_QUALITY_MAX_LEVEL[pet.quality]) return pet
  const newLevel = pet.level + 1
  const statGrowth = 1.03 // +3% per level
  return {
    ...pet,
    level: newLevel,
    stats: {
      hp: Math.floor(pet.stats.hp * statGrowth),
      atk: Math.floor(pet.stats.atk * statGrowth),
      def: Math.floor(pet.stats.def * statGrowth),
      spd: Math.floor(pet.stats.spd * statGrowth),
    },
  }
}

export function tryCapturePet(fortune: number, targetQuality: PetQuality): boolean {
  const baseRate = 0.30 + fortune * 0.02
  // Lower quality = higher rate
  const qualityMod =
    targetQuality === 'common' ? 1.0 :
    targetQuality === 'spirit' ? 0.7 :
    targetQuality === 'immortal' ? 0.4 :
    0.2
  return Math.random() < baseRate * qualityMod
}

function petSkillToActiveSkill(skill: PetSkill): ActiveSkill {
  return {
    id: skill.id,
    name: skill.name,
    category: 'attack',
    element: (skill.element === 'neutral' ? 'fire' : skill.element) as ActiveSkill['element'],
    multiplier: skill.multiplier,
    spiritCost: 5,
    cooldown: 0,
    description: skill.description,
    tier: 1,
  }
}

export function getPetCombatUnit(pet: Pet): import('../combat/CombatEngine').CombatUnit {
  return {
    id: pet.id,
    name: pet.name,
    team: 'ally',
    hp: pet.stats.hp,
    maxHp: pet.stats.hp,
    atk: pet.stats.atk,
    def: pet.stats.def,
    spd: pet.stats.spd,
    crit: 0.05,
    critDmg: 1.3,
    element: pet.element === 'neutral' ? 'fire' : pet.element,
    spiritPower: 20,
    maxSpiritPower: 20,
    skills: [
      petSkillToActiveSkill(pet.innateSkill),
      ...(pet.equippedSkills.filter(Boolean) as PetSkill[]).map(petSkillToActiveSkill),
    ],
    skillCooldowns: [0, 0, 0],
  }
}
