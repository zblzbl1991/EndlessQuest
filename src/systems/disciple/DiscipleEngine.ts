import type { Disciple, DiscipleQuality } from '../../types/sect'

export const QUALITY_LEVEL_CAP: Record<DiscipleQuality, number> = {
  common: 30, spirit: 50, immortal: 70, divine: 99,
}

export const QUALITY_NAMES: Record<DiscipleQuality, string> = {
  common: '凡品', spirit: '灵品', immortal: '仙品', divine: '神品',
}

export const QUALITY_COLORS: Record<DiscipleQuality, string> = {
  common: 'var(--color-quality-common)', spirit: 'var(--color-quality-spirit)',
  immortal: 'var(--color-quality-immortal)', divine: 'var(--color-quality-divine)',
}

export const QUALITY_STAT_MULT: Record<DiscipleQuality, number> = {
  common: 0.3, spirit: 0.5, immortal: 0.7, divine: 1.0,
}

export const WOUNDED_RECOVERY_TIME: Record<DiscipleQuality, number> = {
  common: 60, spirit: 90, immortal: 120, divine: 180, // seconds
}

export interface RecruitResult {
  success: boolean
  disciple: Disciple | null
}

let _discipleIdCounter = 0

export function generateDisciple(quality: DiscipleQuality): Disciple {
  const id = `disciple_${Date.now()}_${++_discipleIdCounter}`
  const statMult = QUALITY_STAT_MULT[quality]
  const talent = Math.floor(Math.random() * 40) + (quality === 'common' ? 1 : quality === 'spirit' ? 20 : quality === 'immortal' ? 40 : 60)
  const loyalty = 80 + Math.floor(Math.random() * 21)

  return {
    id,
    name: generateName(),
    quality,
    level: 1,
    talent,
    loyalty,
    hp: Math.floor(50 * statMult * (1 + talent / 200)),
    atk: Math.floor(8 * statMult * (1 + talent / 200)),
    def: Math.floor(5 * statMult * (1 + talent / 200)),
    spd: Math.floor(6 * statMult * (1 + talent / 200)),
    equippedTechniques: [null, null],
    equippedSkills: [null, null, null],
    status: 'active',
    dispatchEndTime: null,
    highestQualityOwned: quality,
  }
}

const SURNAMES = ['张', '李', '王', '赵', '刘', '陈', '杨', '黄', '周', '吴', '徐', '孙', '马', '朱', '胡', '林', '郭', '何', '罗', '高']
const GIVEN_NAMES = ['青云', '明月', '天宇', '雨萱', '浩然', '诗涵', '子墨', '梓涵', '一诺', '欣怡', '宇轩', '思远', '若溪', '星辰', '清风', '映雪', '玄机', '灵儿', '墨尘', '紫烟']

function generateName(): string {
  return SURNAMES[Math.floor(Math.random() * SURNAMES.length)] + GIVEN_NAMES[Math.floor(Math.random() * GIVEN_NAMES.length)]
}

export function recruitDisciple(maxQuality: DiscipleQuality): RecruitResult {
  const qualities: DiscipleQuality[] = ['common', 'spirit', 'immortal', 'divine']
  const maxIdx = qualities.indexOf(maxQuality)
  // Weighted random: common 60%, spirit 30%, immortal 8%, divine 2%
  const weights = [60, 30, 8, 2]
  // Cap at max quality
  const cappedWeights = weights.map((w, i) => i <= maxIdx ? w : 0)
  const total = cappedWeights.reduce((a, b) => a + b, 0)
  let roll = Math.random() * total
  let quality: DiscipleQuality = 'common'
  for (let i = 0; i < qualities.length; i++) {
    roll -= cappedWeights[i]
    if (roll <= 0) { quality = qualities[i]; break }
  }
  return { success: true, disciple: generateDisciple(quality) }
}

export function trainDisciple(disciple: Disciple, deltaSec: number): Disciple {
  if (disciple.status !== 'active') return disciple
  const cap = QUALITY_LEVEL_CAP[disciple.quality]
  if (disciple.level >= cap) return disciple
  // Very slow training: 1 level per 60 seconds * quality mult
  const trainRate = 1 / (60 * QUALITY_LEVEL_CAP[disciple.quality]) * (1 + disciple.talent / 100)
  const newLevel = Math.min(cap, disciple.level + Math.floor(trainRate * deltaSec))
  if (newLevel <= disciple.level) return disciple

  const levelGained = newLevel - disciple.level
  const statMult = QUALITY_STAT_MULT[disciple.quality]
  return {
    ...disciple,
    level: newLevel,
    hp: disciple.hp + Math.floor(5 * statMult * levelGained * (1 + disciple.talent / 200)),
    atk: disciple.atk + Math.floor(1 * statMult * levelGained * (1 + disciple.talent / 200)),
    def: disciple.def + Math.floor(0.5 * statMult * levelGained * (1 + disciple.talent / 200)),
    spd: disciple.spd + Math.floor(0.6 * statMult * levelGained * (1 + disciple.talent / 200)),
  }
}
