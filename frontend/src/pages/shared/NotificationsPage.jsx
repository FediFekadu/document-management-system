import { useState, useEffect } from 'react'
import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react'
import { notificationsApi } from '../../api/misc'
import { timeAgo, getErrorMessage } from '../../utils/helpers'
import toast from 'react-hot-toast'

const NOTIF_ICONS = {
  project_access: '🔓',
  project_access_removed: '🔒',
  new_document: '📄',
  document_updated: '📝',
  default: '🔔',
}

export default function NotificationsPage() {
  const [notifs, setNotifs]   = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('all')

  const load = () => {
    setLoading(true)
    const params = tab === 'unread' ? { unread: '1' } : {}
    notificationsApi.list(params)
      .then(r => setNotifs(r.data.data || []))
      .catch(() => toast.error('Failed to load notifications'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [tab])

  const markRead = async id => {
    try {
      await notificationsApi.markRead(id)
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n))
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead()
      setNotifs(prev => prev.map(n => ({ ...n, is_read: 1 })))
      toast.success('All marked as read.')
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  const deleteNotif = async id => {
    try {
      await notificationsApi.delete(id)
      setNotifs(prev => prev.filter(n => n.id !== id))
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  const unreadCount = notifs.filter(n => !n.is_read).length

  return (
    <div style={{ maxWidth: 680 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          {unreadCount > 0 && <p className="page-subtitle">{unreadCount} unread</p>}
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={markAllRead}><CheckCheck size={14} /> Mark all read</button>
        )}
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>All</button>
        <button className={`tab ${tab === 'unread' ? 'active' : ''}`} onClick={() => setTab('unread')}>Unread {unreadCount > 0 && `(${unreadCount})`}</button>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : notifs.length === 0 ? (
        <div className="empty-state">
          <Bell size={40} />
          <h3>No notifications</h3>
          <p>You're all caught up!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {notifs.map(n => (
            <div key={n.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 18px',
                background: n.is_read ? '#fff' : 'var(--color-primary-light)',
                borderRadius: 'var(--radius)', border: '1px solid var(--color-gray-200)',
                transition: 'background .15s',
              }}>
              <div style={{ fontSize: '1.4rem', lineHeight: 1, marginTop: 2 }}>
                {NOTIF_ICONS[n.type] || NOTIF_ICONS.default}
              </div>
              <div style={{ flex: 1 }}>
                <div className="font-semibold text-sm">{n.title}</div>
                <div className="text-sm text-muted" style={{ marginTop: 2 }}>{n.message}</div>
                <div className="text-xs text-muted" style={{ marginTop: 4 }}>{timeAgo(n.created_at)}</div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {!n.is_read && (
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => markRead(n.id)} title="Mark read">
                    <Check size={14} />
                  </button>
                )}
                <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-danger)' }}
                  onClick={() => deleteNotif(n.id)} title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
