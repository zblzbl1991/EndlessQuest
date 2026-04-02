import { getDiscipleMutationDef } from '../../data/discipleMutations'
import type { AdventureReport, AdventureReportStep } from '../../types'

export interface AdventureReportInsight {
  coreName: string
  keyBuild: string
  mutationHighlights: string[]
  turningPoint: string
  cause: string
}

function getLastStepOfTypes(report: AdventureReport, types: AdventureReportStep['type'][]) {
  for (let i = report.steps.length - 1; i >= 0; i--) {
    if (types.includes(report.steps[i].type)) return report.steps[i]
  }
  return null
}

function getDiscipleName(report: AdventureReport, nameMap: Map<string, string>, charId: string): string {
  return report.teamSnapshot?.[charId]?.name ?? nameMap.get(charId) ?? charId
}

export function buildAdventureReportInsight(
  report: AdventureReport,
  nameMap: Map<string, string>
): AdventureReportInsight {
  const finalMemberStates = report.finalMemberStates ?? {}
  const discipleMutations = report.discipleMutations ?? {}

  const members = report.teamCharacterIds
    .map((id) => {
      const state = finalMemberStates[id]
      if (!state) return null
      return {
        id,
        name: getDiscipleName(report, nameMap, id),
        ratio: state.maxHp > 0 ? state.currentHp / state.maxHp : 0,
        state,
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  const coreMember =
    members.sort((a, b) => {
      if (b.ratio !== a.ratio) return b.ratio - a.ratio
      return b.state.currentHp - a.state.currentHp
    })[0] ?? null

  const blessingStep = getLastStepOfTypes(report, ['blessing_decision'])
  const relicStep = getLastStepOfTypes(report, ['auto_choice_made'])
  const turningStep = getLastStepOfTypes(report, [
    'member_state_changed',
    'run_retreated',
    'run_failed',
    'run_completed',
  ])
  const mutationHighlights = Object.entries(discipleMutations)
    .flatMap(([charId, mutationIds]) => {
      const discipleName = getDiscipleName(report, nameMap, charId)
      return mutationIds.map((mutationId) => `${discipleName} · ${getDiscipleMutationDef(mutationId).name}`)
    })
    .slice(0, 3)

  const keyBuild = [blessingStep?.summary, relicStep?.summary].filter(Boolean).join(' / ')

  let cause = '暂无明确原因'
  if (report.result === 'completed') {
    cause = turningStep?.type === 'run_completed' ? '路线与资源选择保持了稳定推进。' : '自动化策略顺利完成了整次探索。'
  } else if (report.result === 'retreated') {
    cause = turningStep?.type === 'run_retreated' ? turningStep.detail : '队伍状态下滑触发了主动回撤。'
  } else if (turningStep?.type === 'run_failed') {
    cause = turningStep.detail
  } else {
    cause = '队伍在推进中失去了继续战斗的能力。'
  }

  return {
    coreName: coreMember?.name ?? '暂无',
    keyBuild: keyBuild || '暂无关键构筑',
    mutationHighlights,
    turningPoint: turningStep?.summary ?? (report.result === 'completed' ? '稳定推进到终局' : '未出现明确转折点'),
    cause,
  }
}
