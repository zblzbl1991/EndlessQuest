import type { Character, CultivationPath, SpecialtyType } from '../types/character'
import type { ActiveSkill, Element, SkillCategory } from '../types/skill'

export const ACTIVE_SKILLS: ActiveSkill[] = [
  // Attack skills
  {
    id: 'sword_qi',
    name: '剑气纵横',
    category: 'attack',
    element: 'lightning',
    multiplier: 1.5,
    spiritCost: 10,
    cooldown: 0,
    description: '凝聚剑气横扫四方',
    tier: 1,
  },
  {
    id: 'fire_palm',
    name: '烈焰掌',
    category: 'attack',
    element: 'fire',
    multiplier: 1.8,
    spiritCost: 15,
    cooldown: 1,
    description: '掌心烈火灼烧敌人',
    tier: 2,
  },
  {
    id: 'ice_blade',
    name: '寒冰剑诀',
    category: 'attack',
    element: 'ice',
    multiplier: 2.2,
    spiritCost: 20,
    cooldown: 2,
    description: '寒气凝剑冰封万物',
    tier: 3,
  },
  {
    id: 'thunder_strike',
    name: '雷霆万钧',
    category: 'attack',
    element: 'lightning',
    multiplier: 2.8,
    spiritCost: 25,
    cooldown: 3,
    description: '引天雷之力轰击',
    tier: 4,
  },
  {
    id: 'heal_art',
    name: '回春术',
    category: 'support',
    element: 'healing',
    multiplier: 0,
    spiritCost: 15,
    cooldown: 2,
    description: '恢复自身30%最大生命',
    tier: 2,
  },
  {
    id: 'ice_shield',
    name: '冰甲术',
    category: 'defense',
    element: 'ice',
    multiplier: 0,
    spiritCost: 12,
    cooldown: 3,
    description: '减少受到伤害30%持续2回合',
    tier: 2,
  },
  // Ultimate skills
  {
    id: 'dao_sword',
    name: '万剑归宗',
    category: 'ultimate',
    element: 'lightning',
    multiplier: 4.0,
    spiritCost: 40,
    cooldown: 5,
    description: '万剑齐发毁天灭地',
    tier: 5,
  },
  {
    id: 'phoenix_strike',
    name: '凤凰涅槃',
    category: 'ultimate',
    element: 'fire',
    multiplier: 3.5,
    spiritCost: 35,
    cooldown: 4,
    description: '浴火重生焚尽一切',
    tier: 4,
  },
]

export function getActiveSkillById(id: string): ActiveSkill | undefined {
  return ACTIVE_SKILLS.find((s) => s.id === id)
}

export const MAX_CHARACTER_SKILL_SLOTS = 5

type CharacterSkillContext = Pick<Character, 'cultivationPath' | 'learnedTechniques' | 'realm' | 'specialties' | 'fateTags'>

interface CombatStyleProfile {
  styleId: string
  styleName: string
  summary: string
  preferredElements: Element[]
  preferredCategories: SkillCategory[]
}

const PATH_STYLE_PROFILES: Record<CultivationPath, CombatStyleProfile> = {
  none: {
    styleId: 'unshaped',
    styleName: '未定流',
    summary: '功法未定，靠基础术法与已悟功法自然成型。',
    preferredElements: ['neutral', 'fire', 'lightning'],
    preferredCategories: ['attack', 'support', 'defense', 'ultimate'],
  },
  sword: {
    styleId: 'sword-burst',
    styleName: '剑修爆发',
    summary: '偏好雷火爆发与收割终结技，重视先手和致命一击。',
    preferredElements: ['lightning', 'fire', 'neutral'],
    preferredCategories: ['attack', 'ultimate', 'defense', 'support'],
  },
  body: {
    styleId: 'body-guard',
    styleName: '体修稳守',
    summary: '以护体和续航为主，兼顾稳健反击。',
    preferredElements: ['ice', 'neutral', 'healing'],
    preferredCategories: ['defense', 'attack', 'support', 'ultimate'],
  },
  alchemy: {
    styleId: 'alchemy-sustain',
    styleName: '丹修续战',
    summary: '更擅长恢复与中程术法，适合长线自动战斗。',
    preferredElements: ['healing', 'fire', 'ice'],
    preferredCategories: ['support', 'attack', 'defense', 'ultimate'],
  },
  beast: {
    styleId: 'beast-skirmish',
    styleName: '御兽游击',
    summary: '更重机动与持续出手，适合在随机局里滚出顺势 build。',
    preferredElements: ['lightning', 'neutral', 'fire'],
    preferredCategories: ['attack', 'support', 'ultimate', 'defense'],
  },
  formation: {
    styleId: 'formation-control',
    styleName: '阵修控场',
    summary: '兼顾护体、控节奏与爆发窗口，战术弹性更高。',
    preferredElements: ['ice', 'lightning', 'neutral'],
    preferredCategories: ['defense', 'attack', 'support', 'ultimate'],
  },
  void: {
    styleId: 'void-gambit',
    styleName: '虚空奇袭',
    summary: '强调高风险高回报的奇袭与极限爆发。',
    preferredElements: ['lightning', 'fire', 'ice'],
    preferredCategories: ['ultimate', 'attack', 'support', 'defense'],
  },
}

const SPECIALTY_SKILL_BONUSES: Partial<Record<SpecialtyType, Partial<Record<SkillCategory, number>>>> = {
  combat: { attack: 2, ultimate: 2 },
  fortune: { attack: 1, support: 1 },
  comprehension: { support: 2, defense: 1 },
  leadership: { support: 1, defense: 2 },
  alchemy: { support: 2, attack: 1 },
  forging: { attack: 1, defense: 1 },
}

function getTierUnlockThreshold(skill: ActiveSkill): number {
  if (skill.category === 'ultimate') {
    return skill.tier >= 5 ? 4 : 3
  }
  if (skill.tier >= 4) return 3
  if (skill.tier >= 3) return 2
  if (skill.tier >= 2) return 1
  return 0
}

function isSkillUnlocked(skill: ActiveSkill, character: CharacterSkillContext): boolean {
  return character.realm >= getTierUnlockThreshold(skill)
}

function inferTechniqueElements(learnedTechniques: string[]): Element[] {
  const ids = new Set(learnedTechniques)
  const result: Element[] = []

  if (ids.has('leishen') || ids.has('leiyu')) result.push('lightning')
  if (ids.has('fentian') || ids.has('lieyan')) result.push('fire')
  if (ids.has('xuanbing') || ids.has('taishang')) result.push('ice')
  if (ids.has('bumiejinshen') || ids.has('houtu') || ids.has('qingxin') || ids.has('jiuzhuan')) {
    result.push('neutral')
  }

  return result
}

function getPreferredElements(character: CharacterSkillContext): Element[] {
  const style = PATH_STYLE_PROFILES[character.cultivationPath]
  const techniqueElements = inferTechniqueElements(character.learnedTechniques)
  const merged = [...style.preferredElements]

  for (const element of techniqueElements) {
    if (!merged.includes(element)) merged.push(element)
  }

  if (character.fateTags.includes('tribulationScar') && !merged.includes('lightning')) {
    merged.unshift('lightning')
  }
  if (character.fateTags.includes('heartDevilSeed') && !merged.includes('fire')) {
    merged.unshift('fire')
  }
  if (character.fateTags.includes('stableDaoHeart') && !merged.includes('healing')) {
    merged.push('healing')
  }

  return merged
}

function scoreSkill(skill: ActiveSkill, character: CharacterSkillContext, preferredElements: Element[]): number {
  const style = PATH_STYLE_PROFILES[character.cultivationPath]
  let score = skill.tier * 10

  const elementIndex = preferredElements.indexOf(skill.element)
  if (elementIndex >= 0) {
    score += (preferredElements.length - elementIndex) * 4
  }

  const categoryIndex = style.preferredCategories.indexOf(skill.category)
  if (categoryIndex >= 0) {
    score += (style.preferredCategories.length - categoryIndex) * 3
  }

  for (const specialty of character.specialties) {
    score += SPECIALTY_SKILL_BONUSES[specialty.type]?.[skill.category] ?? 0
  }

  if (character.fateTags.includes('suddenInsight') && skill.category === 'ultimate') score += 4
  if (character.fateTags.includes('stableDaoHeart') && skill.category === 'support') score += 3
  if (character.fateTags.includes('tribulationScar') && skill.element === 'lightning') score += 5
  if (character.fateTags.includes('heartDevilSeed') && skill.element === 'fire') score += 5

  return score
}

function pickUniqueSkill(
  pool: ActiveSkill[],
  usedIds: Set<string>,
  predicate: (skill: ActiveSkill) => boolean
): ActiveSkill | null {
  const picked = pool.find((skill) => !usedIds.has(skill.id) && predicate(skill))
  if (!picked) return null
  usedIds.add(picked.id)
  return picked
}

export function buildCharacterSkillLoadout(character: CharacterSkillContext): (string | null)[] {
  const preferredElements = getPreferredElements(character)
  const unlockedSkills = ACTIVE_SKILLS.filter((skill) => isSkillUnlocked(skill, character)).sort(
    (a, b) => scoreSkill(b, character, preferredElements) - scoreSkill(a, character, preferredElements)
  )
  const usedIds = new Set<string>()
  const loadout: (string | null)[] = []

  const style = PATH_STYLE_PROFILES[character.cultivationPath]
  const primaryCategory = style.preferredCategories[0]

  const slotRules: Array<(skill: ActiveSkill) => boolean> = [
    (skill) => skill.category === 'attack' && skill.tier <= 2,
    (skill) => skill.category === primaryCategory || skill.category === 'attack',
    (skill) => skill.category === 'support' || skill.category === 'defense',
    (skill) => skill.category === 'attack' && skill.tier >= 3,
    (skill) => skill.category === 'ultimate',
  ]

  for (const rule of slotRules) {
    const picked = pickUniqueSkill(unlockedSkills, usedIds, rule)
    loadout.push(picked?.id ?? null)
  }

  return loadout.slice(0, MAX_CHARACTER_SKILL_SLOTS)
}

export function syncCharacterSkillLoadout<T extends CharacterSkillContext & { equippedSkills?: (string | null)[] }>(
  character: T
): T {
  const nextLoadout = buildCharacterSkillLoadout(character)
  const current = character.equippedSkills ?? []
  const hasChanged =
    current.length !== nextLoadout.length || current.some((skillId, index) => skillId !== nextLoadout[index])

  if (!hasChanged) return character
  return { ...character, equippedSkills: nextLoadout }
}

export function getCombatStyleProfile(character: CharacterSkillContext): CombatStyleProfile {
  return PATH_STYLE_PROFILES[character.cultivationPath]
}
