import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const titles = {
  '/admin':              'Admin Dashboard',
  '/admin/projects':     'Projects',
  '/admin/documents':    'All Documents',
  '/admin/users':        'User Management',
  '/admin/permissions':  'Permissions',
  '/admin/activity':     'Activity Log',
  '/admin/archive':      'Archive',
  '/admin/profile':      'My Profile',
  '/dashboard':          'Dashboard',
  '/projects':           'My Projects',
  '/search':             'Search',
  '/favorites':          'Favorites',
  '/notifications':      'Notifications',
  '/profile':            'My Profile',
}

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()

  const title = Object.entries(titles).find(([k]) => pathname === k || pathname.startsWith(k + '/'))?.[1]
    ?? 'Document Management System'

  return (
    <div className="app-layout">
      <Sidebar open={sidebarOpen} />
      <main className="main-content">
        <Topbar title={title} onMenuClick={() => setSidebarOpen(v => !v)} />
        <div className="page-content">
          <Outlet />
        </div>
      </main>
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.3)', zIndex: 99 }}
        />
      )}
    </div>
  )
}
