import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Shell from './components/Shell'
import DisplaysPage from './pages/DisplaysPage'
import ContentPortalPage from './pages/ContentPortalPage'
import LoginPage from './pages/LoginPage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<Shell />}>
          <Route path="/" element={<Navigate to="/portal" replace />} />
          <Route path="/portal" element={<ContentPortalPage />} />
          <Route path="/admin/content" element={<ContentPortalPage />} />
          <Route path="/admin/displays" element={<DisplaysPage />} />
          <Route path="*" element={<Navigate to="/portal" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
