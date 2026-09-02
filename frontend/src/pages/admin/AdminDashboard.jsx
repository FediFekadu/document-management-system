import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FolderOpen, FileText, Users, Activity, TrendingUp } from 'lucide-react'
import { dashboardApi } from '../../api/misc'
import { formatFileSize, timeAgo } from '../../utils/helpers'
import FileIcon from '../../components/ui/FileIcon'

export default function AdminDashboard() {
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    dashboardApi.stats()
      .then(res => {
        if (cancelled) return
        console.log('Dashboard response:', res?.data)
        const d = res?.data?.data
        if (d) {
          setStats(d)
        } else {
          setError('Empty response from server.')
        }
      })
      .catch(err => {
        if (cancelled) return
        console.error('Dashboard error:', err?.response?.data || err?.message)
        const msg = err?.response?.data?.message || err?.message || 'Network error'
        setError(msg)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner" />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 32 }}>
        <div style={{
          background: 'var(--color-danger-light)', color: 'var(--color-danger)',
          padding: '16px 20px', borderRadius: 'var(--radius)', marginBottom: 16,
          fontWeight: 600
        }}>
          ⚠️ Dashboard Error: {error}
        </div>
        <button
          className="btn btn-primary"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    )
  }

  // Safe accessors with defaults
  const p = stats?.projects  || { total: 0, active: 0, completed: 0, archived: 0 }
  const d = stats?.documents || { total: 0, active: 0, archived: 0, total_size: 0 }
  const u = stats?.users     || { total: 0, active: 0, inactive: 0 }
  const recentActivity  = stats?.recent_activity  || []
  const recentDocuments = stats?.recent_documents || []

  return (
    <div>
      {/* ── Stat cards ─────────────────────────────────────────── */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><FolderOpen size={22} /></div>
          <div className="stat-info">
            <div className="stat-value">{Number(p.total) || 0}</div>
            <div className="stat-label">Total Projects</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green"><FileText size={22} /></div>
          <div className="stat-info">
            <div className="stat-value">{Number(d.total) || 0}</div>
            <div className="stat-label">Total Documents</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon yellow"><Users size={22} /></div>
          <div className="stat-info">
            <div className="stat-value">{Number(u.total) || 0}</div>
            <div className="stat-label">Registered Users</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon cyan"><TrendingUp size={22} /></div>
          <div className="stat-info">
            <div className="stat-value">{Number(p.active) || 0}</div>
            <div className="stat-label">Active Projects</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon red"><Activity size={22} /></div>
          <div className="stat-info">
            <div className="stat-value">{formatFileSize(Number(d.total_size) || 0)}</div>
            <div className="stat-label">Storage Used</div>
          </div>
        </div>
      </div>

      {/* ── Recent docs + activity ──────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent Documents */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Documents</h3>
            <Link to="/admin/documents" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          {recentDocuments.length === 0 ? (
            <p className="text-muted" style={{ padding: '16px 20px' }}>No documents yet.</p>
          ) : recentDocuments.map(doc => (
            <div key={doc.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 20px', borderBottom: '1px solid var(--color-gray-100)'
            }}>
              <FileIcon type={doc.file_type} size={36} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="font-semibold text-sm truncate">{doc.title}</div>
                <div className="text-xs text-muted">
                  {doc.project_name} · {formatFileSize(Number(doc.file_size) || 0)}
                </div>
              </div>
              <div className="text-xs text-muted">{timeAgo(doc.created_at)}</div>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Activity</h3>
            <Link to="/admin/activity" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          {recentActivity.length === 0 ? (
            <p className="text-muted" style={{ padding: '16px 20px' }}>No activity yet.</p>
          ) : recentActivity.map(log => (
            <div key={log.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '12px 20px', borderBottom: '1px solid var(--color-gray-100)'
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--color-primary)', marginTop: 6, flexShrink: 0
              }} />
              <div style={{ flex: 1 }}>
                <div className="text-sm">
                  <strong>{log.user_name}</strong>{' '}
                  {String(log.action).replace(/_/g, ' ')}
                  {log.entity_name ? <> — <em>{log.entity_name}</em></> : null}
                </div>
                <div className="text-xs text-muted">{timeAgo(log.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Overview bar ───────────────────────────────────────── */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <h3 className="card-title">Overview</h3>
          <Link to="/admin/projects" className="btn btn-ghost btn-sm">Manage projects</Link>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-success)' }}>
                {Number(p.active) || 0}
              </div>
              <div className="text-sm text-muted">Active Projects</div>
            </div>
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                {Number(p.completed) || 0}
              </div>
              <div className="text-sm text-muted">Completed</div>
            </div>
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-gray-400)' }}>
                {Number(p.archived) || 0}
              </div>
              <div className="text-sm text-muted">Archived</div>
            </div>
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-warning)' }}>
                {Number(u.active) || 0}
              </div>
              <div className="text-sm text-muted">Active Users</div>
            </div>
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-info)' }}>
                {Number(d.active) || 0}
              </div>
              <div className="text-sm text-muted">Active Documents</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
