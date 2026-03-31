import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { useSectStore } from './stores/sectStore'
import { useAdventureStore } from './stores/adventureStore'
import { useGameStore } from './stores/gameStore'
import { IdleEngine, calcOfflineSeconds } from './systems/idle/IdleEngine'
import { loadGame } from './systems/save/SaveSystem'
import { startAutoSave } from './systems/save/startAutoSave'
import Sidebar from './components/common/Sidebar'
import BottomNav from './components/common/BottomNav'
import TopBar from './components/common/TopBar'
import ErrorBoundary from './components/common/ErrorBoundary'
import OfflineReportModal from './components/common/OfflineReportModal'
import type { OfflineReportData } from './components/common/OfflineReportModal'
const SectPage = lazy(() => import('./pages/SectPage'))
const CharactersPage = lazy(() => import('./pages/CharactersPage'))
const BuildingsPage = lazy(() => import('./pages/BuildingsPage'))
const AdventurePage = lazy(() => import('./pages/AdventurePage'))
const AdventureReportPage = lazy(() => import('./pages/AdventureReportPage'))
const VaultPage = lazy(() => import('./pages/VaultPage'))
const EventLogPage = lazy(() => import('./pages/EventLogPage'))

export default function App() {
  const startGame = useGameStore((s) => s.startGame)
  const tickAll = useSectStore((s) => s.tickAll)
  const tickAllIdle = useAdventureStore((s) => s.tickAllIdle)
  const lastOnlineTime = useGameStore((s) => s.lastOnlineTime)

  const [isLoaded, setIsLoaded] = useState(false)
  const [offlineReport, setOfflineReport] = useState<OfflineReportData | null>(null)
  const loadingRef = useRef(false)

  useEffect(() => {
    if (loadingRef.current) return
    loadingRef.current = true
    ;(async () => {
      try {
        await loadGame()
      } catch (e) {
        console.error('Failed to load save:', e)
      }
      setIsLoaded(true)
    })()
  }, [])

  useEffect(() => {
    if (!isLoaded) return

    const cleanup = startAutoSave()

    startGame()

    // Offline catch-up
    const offline = calcOfflineSeconds(lastOnlineTime)
    if (offline > 1) {
      tickAll(offline)

      // Show offline report if away for more than 60 seconds
      // Use microtask to avoid calling setState synchronously within the effect
      if (offline > 60) {
        const acc = useSectStore.getState().sect.offlineAccumulator
        const reportData: OfflineReportData = {
          offlineSeconds: offline,
          resourcesGained: { ...acc.resourcesGained },
          breakthroughs: [...acc.breakthroughs],
          itemsCrafted: [...acc.itemsCrafted],
          taxIncome: acc.taxIncome,
        }
        queueMicrotask(() => setOfflineReport(reportData))
      }
    }

    // Start engine
    const engine = new IdleEngine((delta) => {
      const paused = useGameStore.getState().isPaused
      if (paused) return
      tickAll(delta)
      tickAllIdle(delta)
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
              <Route path="/adventure/report/:reportId" element={<AdventureReportPage />} />
              <Route path="/vault" element={<VaultPage />} />
              <Route path="/log" element={<EventLogPage />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
      <BottomNav />
      {offlineReport && <OfflineReportModal report={offlineReport} onClose={handleCloseReport} />}
    </BrowserRouter>
  )
}
