import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FolderOpen, FileText, Users, Shield,
  Activity, Archive, Settings, LogOut, User, Bell, Star, Search
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const adminNav = [
  { section: 'Main' },
  { to: '/admin',          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/projects', icon: FolderOpen,       label: 'Projects' },
  { to: '/admin/documents',icon: FileText,          label: 'Documents' },
  { section: 'Management' },
  { to: '/admin/users',       icon: Users,    label: 'Users' },
  { to: '/admin/permissions', icon: Shield,   label: 'Permissions' },
  { to: '/admin/activity',    icon: Activity, label: 'Activity Log' },
  { to: '/admin/archive',     icon: Archive,  label: 'Archive' },
  { section: 'Account' },
  { to: '/admin/profile',  icon: User,  label: 'Profile' },
  { to: '/notifications',  icon: Bell,  label: 'Notifications' },
]

const userNav = [
  { section: 'Main' },
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects',     icon: FolderOpen,       label: 'My Projects' },
  { section: 'Tools' },
  { to: '/search',       icon: Search, label: 'Search' },
  { to: '/favorites',    icon: Star,   label: 'Favorites' },
  { to: '/notifications',icon: Bell,   label: 'Notifications' },
  { section: 'Account' },
  { to: '/profile',      icon: User,   label: 'Profile' },
]

export default function Sidebar({ open }) {
  const { user, logout, isAdmin } = useAuth()
  const nav = isAdmin ? adminNav : userNav

  const handleLogout = async () => {
    try { await logout() }
    catch { toast.error('Logout failed') }
  }

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <h2>📁 DMS</h2>
        <span>{isAdmin ? 'Admin Panel' : 'User Portal'}</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {nav.map((item, i) =>
          item.section ? (
            <div key={i} className="nav-section">
              <div className="nav-section-title">{item.section}</div>
            </div>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin' || item.to === '/dashboard'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          )
        )}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--color-primary)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '.8rem', fontWeight: 700, color: '#fff', flexShrink: 0
          }}>
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '.8rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.first_name} {user?.last_name}
            </div>
            <div style={{ fontSize: '.7rem', color: 'var(--color-gray-400)', textTransform: 'capitalize' }}>{user?.role}</div>
          </div>
        </div>
        <button className="nav-item" style={{ width: '100%', border: 'none' }} onClick={handleLogout}>
          <LogOut size={16} /> Logout
        </button>
      </div>
    </aside>
  )
}
