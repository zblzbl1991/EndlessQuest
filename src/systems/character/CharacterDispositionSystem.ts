import type { Character, CharacterStatus, CultivationPath, SpecialtyType } from '../../types/character'

export type CharacterDispositionBand = 'high' | 'mid' | 'low'

export interface CharacterDispositionFacet {
  key: 'management' | 'adventure' | 'risk'
  title: string
  label: string
  description: string
  band: CharacterDispositionBand
  score: number
}

export interface CharacterDisposition {
  management: CharacterDispositionFacet
  adventure: CharacterDispositionFacet
  risk: CharacterDispositionFacet
}

const MANAGEMENT_SPECIALTY_WEIGHTS: Partial<Record<SpecialtyType, number>> = {
  alchemy: 18,
  forging: 15,
  mining: 14,
  herbalism: 14,
  comprehension: 16,
  leadership: 6,
}

const ADVENTURE_SPECIALTY_WEIGHTS: Partial<Record<SpecialtyType, number>> = {
  combat: 24,
  fortune: 18,
  leadership: 14,
  comprehension: 4,
}

const RISK_SPECIALTY_WEIGHTS: Partial<Record<SpecialtyType, number>> = {
  combat: 6,
  fortune: 12,
  leadership: 8,
  comprehension: 3,
}

const MANAGEMENT_PATH_BONUS: Partial<Record<CultivationPath, number>> = {
  alchemy: 16,
  formation: 12,
  void: 6,
  beast: 4,
  body: 3,
  sword: 1,
}

const ADVENTURE_PATH_BONUS: Partial<Record<CultivationPath, number>> = {
  sword: 16,
  body: 14,
  void: 12,
  beast: 10,
  formation: 6,
  alchemy: 4,
}

const RISK_PATH_BONUS: Partial<Record<CultivationPath, number>> = {
  body: 14,
  void: 12,
  beast: 10,
  sword: 8,
  formation: 6,
  alchemy: 4,
}

const MANAGEMENT_STATUS_BONUS: Partial<Record<CharacterStatus, number>> = {
  training: 8,
  patrolling: 4,
  adventuring: -4,
  resting: -6,
  injured: -10,
}

const ADVENTURE_STATUS_BONUS: Partial<Record<CharacterStatus, number>> = {
  adventuring: 4,
  training: -4,
  patrolling: -6,
  resting: -12,
  injured: -18,
}

const RISK_STATUS_BONUS: Partial<Record<CharacterStatus, number>> = {
  adventuring: 2,
  training: -2,
  patrolling: -4,
  resting: -22,
  injured: -55,
}

function sumSpecialtyScore(character: Character, weights: Partial<Record<SpecialtyType, number>>): number {
  return character.specialties.reduce((total, specialty) => total + (weights[specialty.type] ?? 0) * specialty.level, 0)
}

function buildManagementFacet(score: number): CharacterDispositionFacet {
  if (score >= 90) {
    return {
      key: 'management',
      title: '留守价值',
      label: '厚积',
      description: '留宗时更容易把专长、悟性与命格兑现成经营收益。',
      band: 'high',
      score,
    }
  }
  if (score >= 45) {
    return {
      key: 'management',
      title: '留守价值',
      label: '可用',
      description: '留守表现稳定，能作为宗门日常产出的支点。',
      band: 'mid',
      score,
    }
  }
  return {
    key: 'management',
    title: '留守价值',
    label: '待磨',
    description: '留守收益尚未成形，当前更多依赖后续培养。',
    band: 'low',
    score,
  }
}

function buildAdventureFacet(score: number): CharacterDispositionFacet {
  if (score >= 90) {
    return {
      key: 'adventure',
      title: '出战价值',
      label: '锋锐',
      description: '战斗底子和推进能力已经成形，能扛起更重的出战任务。',
      band: 'high',
      score,
    }
  }
  if (score >= 60) {
    return {
      key: 'adventure',
      title: '出战价值',
      label: '可战',
      description: '具备常规出战能力，成败更看队伍搭配与本局意图。',
      band: 'mid',
      score,
    }
  }
  return {
    key: 'adventure',
    title: '出战价值',
    label: '待养',
    description: '当前更像培养胚子，秘境表现还不够稳定。',
    band: 'low',
    score,
  }
}

function buildRiskFacet(score: number): CharacterDispositionFacet {
  if (score >= 80) {
    return {
      key: 'risk',
      title: '承险能力',
      label: '敢试',
      description: '面对波动时心性与底子都更能扛，适合承受更高起伏。',
      band: 'high',
      score,
    }
  }
  if (score >= 55) {
    return {
      key: 'risk',
      title: '承险能力',
      label: '可试',
      description: '可以承受一定波动，但仍要留意当前状态与命格。',
      band: 'mid',
      score,
    }
  }
  return {
    key: 'risk',
    title: '承险能力',
    label: '稳守',
    description: '当前更偏稳守，强压风险容易折损。',
    band: 'low',
    score,
  }
}

export function getCharacterDisposition(character: Character): CharacterDisposition {
  const managementScore =
    sumSpecialtyScore(character, MANAGEMENT_SPECIALTY_WEIGHTS) +
    character.cultivationStats.comprehension * 1.1 +
    character.cultivationStats.spiritualRoot * 0.8 +
    character.learnedTechniques.length * 2 +
    (character.assignedBuilding ? 6 : 0) +
    (MANAGEMENT_PATH_BONUS[character.cultivationPath] ?? 0) +
    (MANAGEMENT_STATUS_BONUS[character.status] ?? 0)

  const adventureScore =
    sumSpecialtyScore(character, ADVENTURE_SPECIALTY_WEIGHTS) +
    character.baseStats.atk * 0.8 +
    character.baseStats.def * 0.5 +
    character.baseStats.spd * 0.6 +
    character.baseStats.hp * 0.03 +
    character.baseStats.crit * 40 +
    character.realm * 6 +
    character.realmStage * 2 +
    character.learnedTechniques.length * 2 +
    (ADVENTURE_PATH_BONUS[character.cultivationPath] ?? 0) +
    (ADVENTURE_STATUS_BONUS[character.status] ?? 0)

  const riskScore =
    sumSpecialtyScore(character, RISK_SPECIALTY_WEIGHTS) +
    character.cultivationStats.fortune * 1.2 +
    character.baseStats.def * 0.7 +
    character.baseStats.hp * 0.1 +
    character.baseStats.spd * 0.5 +
    character.realm * 4 +
    character.realmStage * 2 +
    (RISK_PATH_BONUS[character.cultivationPath] ?? 0) +
    (RISK_STATUS_BONUS[character.status] ?? 0)

  return {
    management: buildManagementFacet(managementScore),
    adventure: buildAdventureFacet(adventureScore),
    risk: buildRiskFacet(riskScore),
  }
}
