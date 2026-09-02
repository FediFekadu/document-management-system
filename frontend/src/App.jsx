import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Component } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppLayout from './components/layout/AppLayout'

// Auth
import LoginPage from './pages/auth/LoginPage'

// Admin pages
import AdminDashboard   from './pages/admin/AdminDashboard'
import AllDocumentsPage from './pages/admin/AllDocumentsPage'
import UsersPage        from './pages/admin/UsersPage'
import PermissionsPage  from './pages/admin/PermissionsPage'
import ActivityPage     from './pages/admin/ActivityPage'
import ArchivePage      from './pages/admin/ArchivePage'

// User pages
import UserDashboard from './pages/user/UserDashboard'

// Shared project pages
import ProjectsPage      from './pages/projects/ProjectsPage'
import ProjectDetailPage from './pages/projects/ProjectDetailPage'

// Shared pages
import SearchPage        from './pages/shared/SearchPage'
import NotificationsPage from './pages/shared/NotificationsPage'
import FavoritesPage     from './pages/shared/FavoritesPage'
import ProfilePage       from './pages/shared/ProfilePage'

// ── Error boundary ────────────────────────────────────────────────
class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32 }}>
          <h2 style={{ color: 'var(--color-danger)', marginBottom: 12 }}>Something went wrong</h2>
          <pre style={{ background: '#f3f4f6', padding: 16, borderRadius: 8, fontSize: 12, overflow: 'auto' }}>
            {this.state.error?.message}
            {'\n'}
            {this.state.error?.stack}
          </pre>
          <button className="btn btn-primary" style={{ marginTop: 16 }}
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}>
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Route guards ──────────────────────────────────────────────────

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
      <div className="spinner" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}

function RequireAdmin({ children }) {
  const { user, loading, isAdmin } = useAuth()
  if (loading) return null
  if (!user)    return <Navigate to="/login"    replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return children
}

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user)   return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />
}

// ── App ───────────────────────────────────────────────────────────

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RootRedirect />} />

      {/* Protected layout */}
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>

        {/* Admin routes */}
        <Route path="/admin" element={
          <RequireAdmin><ErrorBoundary><AdminDashboard /></ErrorBoundary></RequireAdmin>
        } />
        <Route path="/admin/projects"    element={<RequireAdmin><ProjectsPage /></RequireAdmin>} />
        <Route path="/admin/documents"   element={<RequireAdmin><AllDocumentsPage /></RequireAdmin>} />
        <Route path="/admin/users"       element={<RequireAdmin><UsersPage /></RequireAdmin>} />
        <Route path="/admin/permissions" element={<RequireAdmin><PermissionsPage /></RequireAdmin>} />
        <Route path="/admin/activity"    element={<RequireAdmin><ActivityPage /></RequireAdmin>} />
        <Route path="/admin/archive"     element={<RequireAdmin><ArchivePage /></RequireAdmin>} />
        <Route path="/admin/profile"     element={<RequireAdmin><ProfilePage /></RequireAdmin>} />

        {/* User routes */}
        <Route path="/dashboard" element={<ErrorBoundary><UserDashboard /></ErrorBoundary>} />
        <Route path="/projects"  element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />

        {/* Shared routes */}
        <Route path="/search"        element={<SearchPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/favorites"     element={<FavoritesPage />} />
        <Route path="/profile"       element={<ProfilePage />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: { fontSize: '.875rem', maxWidth: 400 },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}
