import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useGameStore } from './stores/gameStore'
import { usePlayerStore } from './stores/playerStore'
import { useInventoryStore } from './stores/inventoryStore'
import { useSectStore } from './stores/sectStore'
import { useAdventureStore } from './stores/adventureStore'
import { IdleEngine, calcOfflineSeconds, calcOfflineRevenue } from './systems/idle/IdleEngine'
import { calcCultivationRate, calcSpiritCostPerSecond } from './systems/cultivation/CultivationEngine'
import { calcResourceRates } from './systems/economy/ResourceEngine'
import { useAutoSave } from './systems/save/useAutoSave'
import TopBar from './components/common/TopBar'
import BottomNav from './components/common/BottomNav'
import MainHall from './pages/MainHall'
import Cultivation from './pages/Cultivation'
import Sect from './pages/Sect'
import Adventure from './pages/Adventure'
import Inventory from './pages/Inventory'

export default function App() {
  // Load saved state on mount and set up auto-save
  useAutoSave()

  // Offline catch-up: calculate revenue earned while away
  useEffect(() => {
    const lastTime = useGameStore.getState().lastOnlineTime
    const offlineSec = calcOfflineSeconds(lastTime)
    if (offlineSec < 2) return // too short to bother

    const player = usePlayerStore.getState().player
    const rate = calcCultivationRate(player)
    const spiritCost = calcSpiritCostPerSecond()

    const sectState = useSectStore.getState()
    const sfLevel = sectState.buildings.find(b => b.type === 'spiritField')?.level ?? 0
    const mainHallLevel = sectState.buildings.find(b => b.type === 'mainHall')?.level ?? 0
    const resRates = calcResourceRates({ spiritField: sfLevel, mainHall: mainHallLevel })

    const revenue = calcOfflineRevenue(offlineSec, rate, spiritCost, resRates.spiritEnergy, resRates.herb)

    if (revenue.cultivationGained > 0) {
      usePlayerStore.getState().addCultivation(revenue.cultivationGained)
      useInventoryStore.getState().spendResource('spiritEnergy', revenue.spiritSpent)
    }
    if (revenue.spiritGained > 0) {
      useInventoryStore.getState().addResource('spiritEnergy', revenue.spiritGained)
    }
    if (revenue.herbGained > 0) {
      useInventoryStore.getState().addResource('herb', revenue.herbGained)
    }

    useGameStore.getState().updateLastOnlineTime()
  }, [])

  // Main idle loop
  useEffect(() => {
    const engine = new IdleEngine()

    engine.start((deltaSec) => {
      const paused = useGameStore.getState().isPaused
      if (paused) return

      // 1. Resource production
      useInventoryStore.getState().tickResourceProduction(deltaSec)

      // 2. Cultivation (spend spirit energy, gain cultivation)
      const spiritEnergy = useInventoryStore.getState().resources.spiritEnergy
      const result = usePlayerStore.getState().tick(spiritEnergy, deltaSec)
      if (result.spiritSpent > 0) {
        useInventoryStore.getState().spendResource('spiritEnergy', result.spiritSpent)
      }

      // 3. Disciple training
      useSectStore.getState().trainDisciples(deltaSec)

      // 4. Idle dungeon progression (every ~3 seconds)
      if (Math.floor(Date.now() / 3000) !== Math.floor((Date.now() - deltaSec * 1000) / 3000)) {
        useAdventureStore.getState().idleTick()
      }
    })

    return () => engine.stop()
  }, [])

  return (
    <BrowserRouter>
      <TopBar />
      <Routes>
        <Route path="/" element={<MainHall />} />
        <Route path="/cultivation" element={<Cultivation />} />
        <Route path="/sect" element={<Sect />} />
        <Route path="/adventure" element={<Adventure />} />
        <Route path="/inventory" element={<Inventory />} />
      </Routes>
      <BottomNav />
    </BrowserRouter>
  )
}
