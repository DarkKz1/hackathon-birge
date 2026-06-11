import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import './index.css'
import { StoreProvider, useStore } from './lib/store'
import { Toasts } from './components/ui'
import Welcome from './screens/Welcome'
import Verify from './screens/Verify'
import Setup from './screens/Setup'
import Interests from './screens/Interests'
import Feed from './screens/Feed'
import ProductDetail from './screens/ProductDetail'
import Groups from './screens/Groups'
import ProfileScreen from './screens/ProfileScreen'

function Guard({ children }: { children: React.ReactNode }) {
  const { profile } = useStore()
  const loc = useLocation()
  if (!profile.onboarded && !['/', '/verify', '/setup', '/interests'].includes(loc.pathname)) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <Guard>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/interests" element={<Interests />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/p/:id" element={<ProductDetail />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Guard>
      <Toasts />
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
)
