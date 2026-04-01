import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AdventurePage from '../pages/AdventurePage'
import AdventureReportPage from '../pages/AdventureReportPage'
import { getDiscipleMutationDef } from '../data/discipleMutations'
import { useAdventureStore } from '../stores/adventureStore'
import { useSectStore } from '../stores/sectStore'

function seedReport() {
  const baseCharacter = useSectStore.getState().sect.characters[0]
  useSectStore.setState((s) => ({
    sect: {
      ...s.sect,
      characters: [
        {
          ...baseCharacter,
          id: 'c1',
          name: '娴嬭瘯寮熷瓙',
        },
      ],
    },
  }))

  useAdventureStore.setState({
    reports: [
      {
        id: 'report_1',
        dungeonId: 'lingCaoValley',
        teamCharacterIds: ['c1'],
        strategy: 'steady',
        tacticalPreset: 'balanced',
        startedAt: 1,
        finishedAt: 2,
        result: 'completed',
        floorsCleared: 5,
        rewards: { spiritStone: 120, spiritEnergy: 0, herb: 12, ore: 0 },
        itemRewardCount: 0,
      },
    ],
    reportDetails: {
      report_1: {
        id: 'report_1',
        config: {
          dungeonId: 'lingCaoValley',
          teamCharacterIds: ['c1'],
          supplyLevel: 'basic',
          tacticalPreset: 'balanced',
          automationStrategy: 'steady',
        },
        dungeonId: 'lingCaoValley',
        teamCharacterIds: ['c1'],
        startedAt: 1,
        finishedAt: 2,
        result: 'completed',
        floorsCleared: 5,
        rewards: { spiritStone: 120, spiritEnergy: 0, herb: 12, ore: 0 },
        itemRewards: [],
        finalMemberStates: {
          c1: { currentHp: 80, maxHp: 100, status: 'alive' },
        },
        discipleMutations: {
          c1: ['sword_intent', 'lucky_omen'],
        },
        steps: [
          {
            id: 'step_0',
            type: 'run_started',
            timestamp: 1,
            floor: 1,
            summary: '寮€濮嬫帰绱?',
            detail: '闃熶紞杩涘叆鐏佃崏璋枫€?',
          },
          {
            id: 'step_1',
            type: 'blessing_decision',
            timestamp: 1,
            floor: 1,
            summary: '閫夋嫨绁濈锛氭垬鏂椾笓娉?',
            detail: '闃熶紞閫夋嫨浜嗘洿鍋忔垬鏂楃殑涓村満寮哄寲銆?',
            decisionReason: '绋冲仴鎺ㄨ繘浼樺厛淇濊瘉鐢熷瓨',
          },
          {
            id: 'step_2',
            type: 'member_state_changed',
            timestamp: 1,
            floor: 3,
            summary: '寮熷瓙琛€绾夸笅闄?',
            detail: '娴嬭瘯寮熷瓙鍦ㄤ腑鏈熸垬鏂楀悗淇濇寔绋冲畾杈撳嚭锛屼絾琛€绾垮凡杩涘叆璀︽垝鍖恒€?',
          },
          {
            id: 'step_3',
            type: 'auto_choice_made',
            timestamp: 2,
            floor: 5,
            summary: '鑾峰緱閬楃墿锛氭垬鏃?',
            detail: '鎴樻棗鎻愰珮浜嗗悗缁垬鏂楃殑鍘嬪埗鑳藉姏銆?',
          },
          {
            id: 'step_4',
            type: 'run_completed',
            timestamp: 2,
            floor: 5,
            summary: '閫氬叧瀹屾垚',
            detail: '闃熶紞淇濇寔琛€绾垮苟鎴愬姛娓呭浘銆?',
          },
        ],
      },
    },
  })
}

describe('Adventure report pages', () => {
  beforeEach(() => {
    useSectStore.getState().reset()
    useAdventureStore.getState().reset()
    seedReport()
  })

  it('renders recent exploration summaries on the adventure page', () => {
    render(
      <MemoryRouter>
        <AdventurePage />
      </MemoryRouter>
    )

    expect(screen.getByText('鏈€杩戞帰绱㈣褰?')).toBeInTheDocument()
    expect(screen.getByText('绋冲仴')).toBeInTheDocument()
    expect(screen.getByText('鏌ョ湅杩囩▼')).toBeInTheDocument()
    expect(
      screen.getAllByText((_, node) => {
        const text = node?.textContent ?? ''
        return text.includes('鏍稿績寮熷瓙') && text.includes('娴嬭瘯寮熷瓙')
      }).length
    ).toBeGreaterThan(0)
    expect(screen.getByText('杞姌鐐?')).toBeInTheDocument()
    expect(screen.getByText('寮傚彉')).toBeInTheDocument()
    expect(
      screen.getAllByText((_, node) => {
        const text = node?.textContent ?? ''
        return text.includes('娴嬭瘯寮熷瓙') && text.includes(getDiscipleMutationDef('sword_intent').name)
      }).length
    ).toBeGreaterThan(0)
  })

  it('renders the dedicated exploration report detail route', () => {
    render(
      <MemoryRouter initialEntries={['/adventure/report/report_1']}>
        <Routes>
          <Route path="/adventure/report/:reportId" element={<AdventureReportPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('鎺㈢储杩囩▼')).toBeInTheDocument()
    expect(screen.getByText('娴嬭瘯寮熷瓙')).toBeInTheDocument()
    expect(screen.getByText('閫夋嫨绁濈锛氭垬鏂椾笓娉?')).toBeInTheDocument()
    expect(screen.getByText('鑾峰緱閬楃墿锛氭垬鏃?')).toBeInTheDocument()
    expect(screen.getByText('寮傚彉')).toBeInTheDocument()
    expect(
      screen.getAllByText((_, node) => {
        const text = node?.textContent ?? ''
        return text.includes('娴嬭瘯寮熷瓙') && text.includes(getDiscipleMutationDef('sword_intent').name)
      }).length
    ).toBeGreaterThan(0)
    expect(screen.getByText('闃熶紞淇濇寔琛€绾垮苟鎴愬姛娓呭浘銆?')).toBeInTheDocument()
  })
})
