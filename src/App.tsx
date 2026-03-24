import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { useSectStore } from './stores/sectStore'
import { useAdventureStore } from './stores/adventureStore'
import { useGameStore } from './stores/gameStore'
import { IdleEngine, calcOfflineSeconds } from './systems/idle/IdleEngine'
import { useAutoSave } from './systems/save/useAutoSave'
import BottomNav from './components/common/BottomNav'
import TopBar from './components/common/TopBar'
import SectPage from './pages/SectPage'

// Placeholder pages for future tasks
const CharactersPage = () => <div>弟子页面 - 待实现</div>
const BuildingsPage = () => <div>建筑页面 - 待实现</div>
const AdventurePage = () => <div>秘境页面 - 待实现</div>
const VaultPage = () => <div>仓库页面 - 待实现</div>

export default function App() {
  const startGame = useGameStore((s) => s.startGame)
  const tickAll = useSectStore((s) => s.tickAll)
  const tickAllIdle = useAdventureStore((s) => s.tickAllIdle)
  const lastOnlineTime = useGameStore((s) => s.lastOnlineTime)

  useAutoSave()

  useEffect(() => {
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
  }, [])

  return (
    <BrowserRouter>
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
