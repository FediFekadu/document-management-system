import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { projectsApi } from '../../api/projects'
import { Shield, ChevronRight } from 'lucide-react'
import { getErrorMessage } from '../../utils/helpers'
import MembersPanel from '../projects/MembersPanel'
import toast from 'react-hot-toast'

export default function PermissionsPage() {
  const [searchParams] = useSearchParams()
  const preselect      = searchParams.get('project')

  const [projects, setProjects]   = useState([])
  const [selected, setSelected]   = useState(null)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    projectsApi.list({ per_page: 200, status: 'active' })
      .then(r => {
        const list = r.data.data || []
        setProjects(list)
        if (preselect) {
          const p = list.find(x => x.id == preselect)
          if (p) setSelected(p)
        }
      })
      .catch(() => toast.error('Failed to load projects'))
      .finally(() => setLoading(false))
  }, [preselect])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'flex-start' }}>
      {/* Project list */}
      <div className="card">
        <div className="card-header"><h3 className="card-title">Projects</h3></div>
        <div style={{ padding: '8px 0' }}>
          {loading ? (
            <div className="loading-spinner" style={{ padding: 24 }}><div className="spinner" /></div>
          ) : projects.length === 0 ? (
            <p className="text-muted text-sm" style={{ padding: '12px 16px' }}>No projects.</p>
          ) : (
            projects.map(p => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
                  width: '100%', border: 'none', background: selected?.id === p.id ? 'var(--color-primary-light)' : 'transparent',
                  color: selected?.id === p.id ? 'var(--color-primary)' : 'var(--color-gray-700)',
                  cursor: 'pointer', textAlign: 'left', fontSize: '.875rem',
                  borderRight: selected?.id === p.id ? '3px solid var(--color-primary)' : '3px solid transparent',
                  transition: 'background .15s',
                }}
              >
                <Shield size={14} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="truncate font-semibold">{p.name}</div>
                  <div className="text-xs text-muted">{p.member_count ?? 0} members</div>
                </div>
                <ChevronRight size={14} />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Members panel */}
      <div>
        {selected ? (
          <>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{selected.name}</h2>
              <p className="text-sm text-muted">Manage user access and permissions for this project.</p>
            </div>
            <div className="card" style={{ padding: 20 }}>
              <MembersPanel projectId={selected.id} onRefresh={() => {}} />
            </div>
          </>
        ) : (
          <div className="empty-state">
            <Shield size={48} />
            <h3>Select a project</h3>
            <p>Choose a project from the list to manage its user permissions.</p>
          </div>
        )}
      </div>
    </div>
  )
}
