import { Routes, Route } from 'react-router-dom'
import './App.css'
import BottomNav from './components/BottomNav'
import HomePage from './pages/HomePage'
import BasketPage from './pages/BasketPage'
import BuyersPage from './pages/BuyersPage'
import MorePage from './pages/MorePage'
import SalePage from './pages/SalePage'

export default function App() {
  return (
    <div className="app">
      <div className="page-scroll">
        <Routes>
          <Route path="/"       element={<HomePage />} />
          <Route path="/basket" element={<BasketPage />} />
          <Route path="/buyers" element={<BuyersPage />} />
          <Route path="/more"   element={<MorePage />} />
          <Route path="/sale"   element={<SalePage />} />
        </Routes>
      </div>
      <BottomNav />
    </div>
  )
}
