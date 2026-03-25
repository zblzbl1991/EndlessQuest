import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { useSectStore } from './stores/sectStore'
import { useAdventureStore } from './stores/adventureStore'
import { useGameStore } from './stores/gameStore'
import { IdleEngine, calcOfflineSeconds } from './systems/idle/IdleEngine'
import { useAutoSave } from './systems/save/useAutoSave'
import Sidebar from './components/common/Sidebar'
import BottomNav from './components/common/BottomNav'
import TopBar from './components/common/TopBar'
import SectPage from './pages/SectPage'
import CharactersPage from './pages/CharactersPage'
import BuildingsPage from './pages/BuildingsPage'

import AdventurePage from './pages/AdventurePage'
import VaultPage from './pages/VaultPage'

export default function App() {
  const startGame = useGameStore((s) => s.startGame)
  const tickAll = useSectStore((s) => s.tickAll)
  const tickAllIdle = useAdventureStore((s) => s.tickAllIdle)
  const lastOnlineTime = useGameStore((s) => s.lastOnlineTime)

  const { isLoaded } = useAutoSave()

  useEffect(() => {
    if (!isLoaded) return

    startGame()

    // Offline catch-up
    const offline = calcOfflineSeconds(lastOnlineTime)
    if (offline > 1) {
      tickAll(offline)
    }

    // Start engine
    const engine = new IdleEngine((delta) => {
      const paused = useGameStore.getState().isPaused
      if (paused) return
      tickAll(delta)
      tickAllIdle(delta)
    })
    engine.start()
    return () => engine.stop()
  }, [isLoaded])

  if (!isLoaded) {
    return (
      <div className="loading-screen" style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: '100vh', fontFamily: 'serif', color: '#5a4a3a', background: '#f5f0e8',
      }}>
        <span style={{ fontSize: '1.25rem', opacity: 0.7 }}>Loading...</span>
      </div>
    )
  }

  return (
    <BrowserRouter basename="/EndlessQuest">
      <Sidebar />
      <TopBar />
      <div className="page-content">
        <Routes>
          <Route path="/" element={<SectPage />} />
          <Route path="/characters" element={<CharactersPage />} />
          <Route path="/buildings" element={<BuildingsPage />} />
          <Route path="/adventure" element={<AdventurePage />} />
          <Route path="/vault" element={<VaultPage />} />
        </Routes>
      </div>
      <BottomNav />
    </BrowserRouter>
  )
}
