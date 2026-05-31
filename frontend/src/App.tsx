// frontend/src/App.tsx
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Background } from './components/Background'
import { MenuPage } from './pages/MenuPage'
import { PlayPage } from './pages/PlayPage'
import { LocalPage } from './pages/LocalPage'
import { SettingsPage } from './pages/SettingsPage'
import { AboutPage } from './pages/AboutPage'

export default function App() {
  const location = useLocation()
  return (
    <>
      <Background />
      <div style={{ position: 'relative', zIndex: 1, minHeight: '100%' }}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<MenuPage />} />
            <Route path="/play" element={<PlayPage />} />
            <Route path="/local" element={<LocalPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </AnimatePresence>
      </div>
    </>
  )
}
