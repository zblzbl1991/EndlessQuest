import { BrowserRouter, Routes, Route } from 'react-router-dom'
import TopBar from './components/common/TopBar'
import BottomNav from './components/common/BottomNav'
import MainHall from './pages/MainHall'
import Cultivation from './pages/Cultivation'
import Sect from './pages/Sect'
import Adventure from './pages/Adventure'
import Inventory from './pages/Inventory'

export default function App() {
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
