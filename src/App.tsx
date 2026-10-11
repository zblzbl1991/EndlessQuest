import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { useSectStore } from './stores/sectStore'
import { useAdventureStore } from './stores/adventureStore'
import { useGameStore } from './stores/gameStore'
import { useEventLogStore } from './stores/eventLogStore'
import { emitEvent } from './stores/eventLogStore'
import { GameLoop, calcOfflineSeconds, MAX_OFFLINE_SECONDS } from './systems/idle/GameLoop'
import { getLegacyOfflineBonusHours } from './data/legacy'
import { getGenesisOfflineBonusHours } from './data/genesisTree'
import { aggregateCaveHeavenEffects } from './data/caveHeavens'
import { loadGame } from './systems/save/SaveSystem'
import { loadTestSave } from './systems/save/testFixture'
import { startAutoSave } from './systems/save/startAutoSave'
import { buildOfflineNarrative } from './systems/sect/OfflineNarrativeSystem'
import type { AdventureReport } from './types'
import Sidebar from './components/common/Sidebar'
import BottomNav from './components/common/BottomNav'
import TopBar from './components/common/TopBar'
import ErrorBoundary from './components/common/ErrorBoundary'
import OfflineReportModal from './components/common/OfflineReportModal'
import { diagnoseSectBottlenecks } from './systems/sect/SectBottleneckSystem'
import { getRealmName } from './data/realms'
import type { OfflineAccumulator } from './types'
import type { Sect } from './types'
import type { OfflineReportData } from './components/common/OfflineReportModal'

/** V2.1 工单 06："自上次拜访"摘要——境界变化 Top3 + 资源相对现存倍数。 */
function buildVisitSummary(sect: Sect, acc: OfflineAccumulator): OfflineReportData['visitSummary'] {
  const realmChanges = acc.breakthroughs.slice(-3).map((bt) => {
    const [realmStr, stageStr] = bt.targetRealm.split('-')
    const realm = Number(realmStr)
    const stage = Number(stageStr)
    const toRealmName =
      bt.success && Number.isFinite(realm) && Number.isFinite(stage)
        ? getRealmName(realm, stage as 0 | 1 | 2 | 3)
        : '未知境界'
    return { characterName: bt.characterName, toRealmName, success: bt.success }
  })
  const current = sect.resources
  const multiples = (['spiritStone', 'spiritEnergy', 'herb', 'ore'] as const)
    .map((key) => ({
      label: key === 'spiritStone' ? '灵石' : key === 'spiritEnergy' ? '灵气' : key === 'herb' ? '灵草' : '矿材',
      gained: acc.resourcesGained[key],
      multiple: current[key] > 0 ? acc.resourcesGained[key] / current[key] : 0,
    }))
    .filter((m) => m.gained > 0)
  return { realmChanges, multiples }
}
const SectPage = lazy(() => import('./pages/SectPage'))
const CharactersPage = lazy(() => import('./pages/CharactersPage'))
const BuildingsPage = lazy(() => import('./pages/BuildingsPage'))
const AdventurePage = lazy(() => import('./pages/AdventurePage'))
const AdventureReportPage = lazy(() => import('./pages/AdventureReportPage'))
const VaultPage = lazy(() => import('./pages/VaultPage'))
const EventLogPage = lazy(() => import('./pages/EventLogPage'))

/** Force re-mount when reportId changes so the page fetches fresh data */
function AdventureReportPageWrapper() {
  const { reportId } = useParams()
  return <AdventureReportPage key={reportId} />
}

export default function App() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [offlineReport, setOfflineReport] = useState<OfflineReportData | null>(null)
  const loadingRef = useRef(false)

  useEffect(() => {
    if (loadingRef.current) return
    loadingRef.current = true
    ;(async () => {
      try {
        // Dev shortcut: ?loadTestSave=true loads the regression test fixture
        const params = new URLSearchParams(window.location.search)
        if (params.get('loadTestSave') === 'true') {
          await loadTestSave()
          // Clean the URL param so it doesn't re-trigger on refresh
          const cleanUrl = new URL(window.location.href)
          cleanUrl.searchParams.delete('loadTestSave')
          window.history.replaceState({}, '', cleanUrl.toString())
        }
        await loadGame()
      } catch (e) {
        console.error('Failed to load save:', e)
      }
      setIsLoaded(true)
    })()
  }, [])

  useEffect(() => {
    if (!isLoaded) return

    const { startGame, lastOnlineTime } = useGameStore.getState()
    const { tickAll } = useSectStore.getState()
    const cleanup = startAutoSave()

    startGame()

    // Offline catch-up (ascension tree "temporalInsight" extends the cap)
    const offlineCap =
      MAX_OFFLINE_SECONDS +
      (getLegacyOfflineBonusHours(useSectStore.getState().sect.legacyTree) +
        getGenesisOfflineBonusHours(useSectStore.getState().sect.genesisTree) +
        aggregateCaveHeavenEffects(
          useSectStore.getState().sect.characters.reduce((max, c) => Math.max(max, c.realm), 0),
          useSectStore.getState().sect.caveHeavenAssignments ?? {},
          useSectStore.getState().sect.characters
        ).offlineHours) *
        3600
    const offline = calcOfflineSeconds(lastOnlineTime, offlineCap)
    if (offline > 1) {
      tickAll(offline)

      // Show offline report if away for more than 60 seconds
      // Use microtask to avoid calling setState synchronously within the effect
      if (offline > 60) {
        const sectState = useSectStore.getState()
        const acc = sectState.sect.offlineAccumulator
        const cutoff = Date.now() - offline * 1000
        const adventureState = useAdventureStore.getState()
        const recentReports = adventureState.reports.filter((report) => report.finishedAt >= cutoff).slice(0, 3)
        const recentReportDetails = recentReports
          .map((report) => adventureState.getReport(report.id))
          .filter((report): report is AdventureReport => Boolean(report))
        const recentEvents = useEventLogStore
          .getState()
          .events.filter((event) => event.timestamp >= cutoff)
          .slice(0, 6)
          .map((event) => ({
            id: event.id,
            type: event.type,
            message: event.message,
            data: event.data,
          }))
        const narrative = buildOfflineNarrative({
          sect: sectState.sect,
          accumulator: acc,
          recentReports,
          recentReportDetails,
          recentEvents,
        })
        const reportData: OfflineReportData = {
          offlineSeconds: offline,
          resourcesGained: { ...acc.resourcesGained },
          breakthroughs: [...acc.breakthroughs],
          itemsCrafted: [...acc.itemsCrafted],
          taxIncome: acc.taxIncome,
          lowSpiritSeconds: acc.lowSpiritSeconds,
          visitSummary: buildVisitSummary(sectState.sect, acc),
          combatStats: {
            kills: acc.kills ?? 0,
            dungeonRuns: acc.dungeonRuns ?? 0,
            dungeonFloorsCleared: acc.dungeonFloorsCleared ?? 0,
            equipmentGained: acc.equipmentGained ?? 0,
            equipmentSold: acc.equipmentSold ?? 0,
          },
          suggestions: diagnoseSectBottlenecks(sectState.sect)
            .filter((b) => b.id !== 'stable')
            .slice(0, 2)
            .map((b) => ({ text: `${b.label}：${b.suggestion}`, link: b.link })),
          notableEvents: narrative.notableEvents,
          nextSuggestion: narrative.nextSuggestion,
          loopRewards: narrative.loopRewards,
        }
        queueMicrotask(() => setOfflineReport(reportData))
      }
    }

    // Start engine: rAF-driven fixed-step loop with unified catch-up paths.
    // Pause semantics live inside the loop (elapsed time is discarded while
    // paused), so the callbacks below always simulate the delta they receive.
    const simulate = (delta: number) => {
      useSectStore.getState().tickAll(delta)
      useAdventureStore.getState().tickAllIdle(delta)
    }
    const engine = new GameLoop({
      onSimulate: simulate,
      onCatchUp: simulate,
      isPaused: () => useGameStore.getState().isPaused,
      maxOfflineSeconds: offlineCap,
    })
    engine.start()

    return () => {
      engine.stop()
      cleanup()
    }
  }, [isLoaded])

  const handleCloseReport = () => {
    useSectStore.getState().clearOfflineAccumulator()
    setOfflineReport(null)
  }

  const handleApplyOfflineLoopAdjustment = () => {
    const adjustment = offlineReport?.loopAdjustment
    if (!adjustment?.changes) return

    const sectState = useSectStore.getState()
    const activeTemplateId = sectState.sect.automationSettings.activeTemplateId
    if (activeTemplateId !== 'guixuResonance') return
    const currentTemplate = sectState.sect.automationSettings.expeditionTemplates.find(
      (template) => template.id === activeTemplateId
    )
    if (!currentTemplate) return

    sectState.setAutomationSettings({
      casualtyTolerance: adjustment.changes.riskTolerance ?? sectState.sect.automationSettings.casualtyTolerance,
      expeditionTemplates: sectState.sect.automationSettings.expeditionTemplates.map((template) =>
        template.id === activeTemplateId ? { ...template, ...adjustment.changes } : template
      ),
    })

    const parts: string[] = []
    if (adjustment.changes.riskTolerance && adjustment.changes.riskTolerance !== currentTemplate.riskTolerance) {
      parts.push(
        `风险改为${adjustment.changes.riskTolerance === 'balanced' ? '均衡' : adjustment.changes.riskTolerance === 'conservative' ? '保守' : '赌命'}`
      )
    }
    if (adjustment.changes.supplyLevel && adjustment.changes.supplyLevel !== currentTemplate.supplyLevel) {
      parts.push(
        `补给改为${adjustment.changes.supplyLevel === 'enhanced' ? '充足' : adjustment.changes.supplyLevel === 'luxury' ? '豪华' : '基础'}`
      )
    }
    if (adjustment.changes.rewardFocus && adjustment.changes.rewardFocus !== currentTemplate.rewardFocus) {
      parts.push(
        `收益偏好改为${adjustment.changes.rewardFocus === 'progress' ? '推进' : adjustment.changes.rewardFocus === 'materials' ? '材料' : adjustment.changes.rewardFocus === 'techniques' ? '功法' : adjustment.changes.rewardFocus === 'pets' ? '灵宠' : '资源'}`
      )
    }
    if (parts.length > 0) {
      emitEvent('automation_adjusted', `已按离线建议调整归墟回响：${parts.join('，')}。`, {
        templateId: activeTemplateId,
        source: 'offline_report',
      })
    }

    setOfflineReport((current) =>
      current?.loopAdjustment
        ? {
            ...current,
            loopAdjustment: {
              ...current.loopAdjustment,
              applied: true,
            },
          }
        : current
    )
  }

  if (!isLoaded) {
    return (
      <div
        className="loading-screen"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontFamily: 'serif',
          color: '#5a4a3a',
          background: '#f5f0e8',
        }}
      >
        <span style={{ fontSize: '1.25rem', opacity: 0.7 }}>加载中...</span>
      </div>
    )
  }

  return (
    <BrowserRouter basename="/EndlessQuest">
      <Sidebar />
      <TopBar />
      <div className="page-content">
        <ErrorBoundary>
          <Suspense
            fallback={
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>加载中...</div>
            }
          >
            <Routes>
              <Route path="/" element={<SectPage />} />
              <Route path="/characters" element={<CharactersPage />} />
              <Route path="/buildings" element={<BuildingsPage />} />
              <Route path="/adventure" element={<AdventurePage />} />
              <Route path="/adventure/report/:reportId" element={<AdventureReportPageWrapper />} />
              <Route path="/vault" element={<VaultPage />} />
              <Route path="/log" element={<EventLogPage />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
      <BottomNav />
      {offlineReport && (
        <OfflineReportModal
          report={offlineReport}
          onClose={handleCloseReport}
          onApplyLoopAdjustment={handleApplyOfflineLoopAdjustment}
        />
      )}
    </BrowserRouter>
  )
}
