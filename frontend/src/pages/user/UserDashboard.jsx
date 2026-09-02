import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FolderOpen, FileText, Star } from 'lucide-react'
import { dashboardApi } from '../../api/misc'
import { useAuth } from '../../context/AuthContext'
import { formatFileSize, timeAgo } from '../../utils/helpers'
import FileIcon from '../../components/ui/FileIcon'
import toast from 'react-hot-toast'

export default function UserDashboard() {
  const { user } = useAuth()
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi.stats()
      .then(r => setStats(r.data.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontSize:'1.4rem', fontWeight:700 }}>
          Welcome back, {user?.first_name} 👋
        </h2>
        <p className="text-muted text-sm">Here's what's happening with your projects.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><FolderOpen size={22} /></div>
          <div className="stat-info">
            <div className="stat-value">{stats?.project_count ?? 0}</div>
            <div className="stat-label">My Projects</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><FileText size={22} /></div>
          <div className="stat-info">
            <div className="stat-value">{stats?.document_count ?? 0}</div>
            <div className="stat-label">Accessible Documents</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow"><Star size={22} /></div>
          <div className="stat-info">
            <div className="stat-value">{stats?.favorite_count ?? 0}</div>
            <div className="stat-label">Favorites</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop:8 }}>
        <div className="card-header">
          <h3 className="card-title">Recent Documents</h3>
          <Link to="/projects" className="btn btn-ghost btn-sm">My Projects</Link>
        </div>
        <div style={{ padding:0 }}>
          {!stats?.recent_documents?.length ? (
            <div className="empty-state">
              <FileText size={40} />
              <h3>No documents yet</h3>
              <p>Documents from your projects will appear here.</p>
            </div>
          ) : stats.recent_documents.map(doc => (
            <Link key={doc.id} to={`/projects/${doc.project_id}`}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px',
                borderBottom:'1px solid var(--color-gray-100)', transition:'background .15s' }}
              onMouseEnter={e => e.currentTarget.style.background='var(--color-gray-50)'}
              onMouseLeave={e => e.currentTarget.style.background=''}>
              <FileIcon type={doc.file_type} size={36} />
              <div style={{ flex:1, minWidth:0 }}>
                <div className="font-semibold text-sm truncate">{doc.title}</div>
                <div className="text-xs text-muted">{doc.project_name} · {formatFileSize(doc.file_size)}</div>
              </div>
              <div className="text-xs text-muted">{timeAgo(doc.created_at)}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
