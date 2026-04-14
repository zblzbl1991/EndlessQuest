import type { TemplateConfidenceEntry, RiskTier } from '../../types'

export type ConfidenceStatus = 'stable' | 'optimizable' | 'volatile' | 'suggest_downgrade'

export interface ConfidenceResult {
  entry: TemplateConfidenceEntry
  status: ConfidenceStatus
  statusLabel: string
  statusDetail: string
}

const DEFAULT_CONFIDENCE = 50
const SUCCESS_ADJUSTMENT = 5
const FAILURE_ADJUSTMENT = -8
const CONSECUTIVE_BONUS = 3
const CONSECUTIVE_PENALTY = -4
const MIN_SCORE = 0
const MAX_SCORE = 100

/** Get or create a confidence entry for a template */
export function getOrCreateConfidenceEntry(
  entries: TemplateConfidenceEntry[],
  templateId: string,
  _currentDay: number
): TemplateConfidenceEntry {
  void _currentDay
  const existing = entries.find((e) => e.templateId === templateId)
  if (existing) return existing
  return {
    templateId,
    score: DEFAULT_CONFIDENCE,
    lastAdjustedAtDay: null,
  }
}

/** Adjust template confidence based on run result */
export function adjustTemplateConfidence(
  entries: TemplateConfidenceEntry[],
  templateId: string,
  success: boolean,
  currentDay: number,
  consecutiveResults: 'win' | 'loss' | 'none' = 'none'
): TemplateConfidenceEntry[] {
  const entry = getOrCreateConfidenceEntry(entries, templateId, currentDay)
  let adjustment = success ? SUCCESS_ADJUSTMENT : FAILURE_ADJUSTMENT

  // Consecutive streak bonus/penalty
  if (consecutiveResults === 'win' && success) {
    adjustment += CONSECUTIVE_BONUS
  } else if (consecutiveResults === 'loss' && !success) {
    adjustment += CONSECUTIVE_PENALTY
  }

  // High risk templates get amplified adjustments
  const newScore = Math.max(MIN_SCORE, Math.min(MAX_SCORE, entry.score + adjustment))

  const newEntry: TemplateConfidenceEntry = {
    templateId,
    score: newScore,
    lastAdjustedAtDay: currentDay,
  }

  const existingIdx = entries.findIndex((e) => e.templateId === templateId)
  if (existingIdx >= 0) {
    return entries.map((e, i) => (i === existingIdx ? newEntry : e))
  }
  return [...entries, newEntry]
}

/** Get the confidence status for display */
export function getConfidenceStatus(entry: TemplateConfidenceEntry | undefined): ConfidenceResult {
  if (!entry) {
    return {
      entry: { templateId: '', score: DEFAULT_CONFIDENCE, lastAdjustedAtDay: null },
      status: 'stable',
      statusLabel: '\u7a33\u5b9a',
      statusDetail: '\u5c1a\u65e0\u8dd1\u6b21\u8bb0\u5f55\uff0c\u9ed8\u8ba4\u7a33\u5b9a\u3002',
    }
  }

  const { score } = entry

  if (score >= 70) {
    return {
      entry,
      status: 'stable',
      statusLabel: '\u7a33\u5b9a',
      statusDetail:
        '\u8fd1\u671f\u8dd1\u6b21\u7ed3\u679c\u826f\u597d\uff0c\u53ef\u7ee7\u7eed\u4f7f\u7528\u8be5\u6a21\u677f\u3002',
    }
  }

  if (score >= 50) {
    return {
      entry,
      status: 'optimizable',
      statusLabel: '\u53ef\u4f18\u5316',
      statusDetail: '\u8dd1\u6b21\u7ed3\u679c\u6709\u6ce2\u52a8\uff0c\u53ef\u8003\u8651\u8c03\u6574\u53c2\u6570\u3002',
    }
  }

  if (score >= 30) {
    return {
      entry,
      status: 'volatile',
      statusLabel: '\u6ce2\u52a8\u8f83\u5927',
      statusDetail:
        '\u8fd1\u671f\u5931\u5229\u8f83\u591a\uff0c\u5efa\u8bae\u68c0\u67e5\u961f\u4f0d\u4e0e\u6a21\u677f\u914d\u7f6e\u3002',
    }
  }

  return {
    entry,
    status: 'suggest_downgrade',
    statusLabel: '\u5efa\u8bae\u964d\u6863',
    statusDetail:
      '\u8be5\u6a21\u677f\u8fd1\u671f\u8868\u73b0\u8f83\u5dee\uff0c\u5efa\u8bae\u5207\u6362\u5230\u66f4\u4fdd\u5b88\u7684\u65b9\u6848\u3002',
  }
}

/** Get the confidence change direction label */
export function getConfidenceTrend(
  before: number | undefined,
  after: number | undefined
): 'up' | 'down' | 'unchanged' | 'unknown' {
  if (before === undefined || after === undefined) return 'unknown'
  if (after > before) return 'up'
  if (after < before) return 'down'
  return 'unchanged'
}

/** Get risk tier modifier for confidence adjustment */
export function getRiskTierConfidenceModifier(riskTier: RiskTier | undefined): number {
  switch (riskTier) {
    case 'safe':
      return 0.8
    case 'press':
      return 1.0
    case 'gamble':
      return 1.3
    case 'destiny':
      return 1.5
    default:
      return 1.0
  }
}
