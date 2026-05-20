import { Routes, Route } from 'react-router-dom'
import './App.css'
import BottomNav from './components/BottomNav'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import BasketPage from './pages/BasketPage'
import BuyersPage from './pages/BuyersPage'
import MorePage from './pages/MorePage'
import SalePage from './pages/SalePage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="*"
        element={
          <ProtectedRoute>
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
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
