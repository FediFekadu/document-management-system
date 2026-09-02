import { useState, useEffect } from 'react'
import { Menu, Bell, Search } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { notificationsApi } from '../../api/misc'
import { useAuth } from '../../context/AuthContext'

export default function Topbar({ title, onMenuClick }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [unread, setUnread] = useState(0)
  const [search, setSearch] = useState('')

  useEffect(() => {
    notificationsApi.unreadCount()
      .then(r => setUnread(r.data.data?.count || 0))
      .catch(() => {})

    const timer = setInterval(() => {
      notificationsApi.unreadCount()
        .then(r => setUnread(r.data.data?.count || 0))
        .catch(() => {})
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  const handleSearch = e => {
    e.preventDefault()
    if (search.trim()) navigate(`/search?q=${encodeURIComponent(search.trim())}`)
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="btn btn-ghost btn-icon" onClick={onMenuClick} style={{ display: 'none' }}
          id="menu-toggle">
          <Menu size={20} />
        </button>
        <span className="topbar-title">{title}</span>
      </div>

      <form onSubmit={handleSearch} style={{ flex: 1, maxWidth: 360 }}>
        <div className="search-bar">
          <Search size={15} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search documents…"
          />
        </div>
      </form>

      <div className="topbar-right">
        <Link to="/notifications" style={{ position: 'relative', display: 'flex' }}>
          <button className="btn btn-ghost btn-icon">
            <Bell size={18} />
            {unread > 0 && <span className="notif-dot" />}
          </button>
        </Link>

        <div style={{ fontSize: '.8rem', color: 'var(--color-gray-600)', whiteSpace: 'nowrap' }}>
          {user?.first_name} {user?.last_name}
        </div>
      </div>
    </header>
  )
}
