import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { FolderOpen, FileText, Users, Plus, ChevronRight, Edit, Folder } from 'lucide-react'
import { projectsApi } from '../../api/projects'
import { useAuth } from '../../context/AuthContext'
import { formatDate, getStatusBadge, getErrorMessage } from '../../utils/helpers'
import DocumentsPanel from '../documents/DocumentsPanel'
import MembersPanel from './MembersPanel'
import toast from 'react-hot-toast'

const TABS = ['Documents', 'Folders', 'Members']

export default function ProjectDetailPage() {
  const { id } = useParams()
  const { isAdmin } = useAuth()
  const navigate = useNavigate()

  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('Documents')

  const load = () => {
    setLoading(true)
    projectsApi.get(id)
      .then(r => setProject(r.data.data))
      .catch(() => { toast.error('Project not found'); navigate('/projects') })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>
  if (!project) return null

  const userPerms = project.permissions || { can_view: 1, can_upload: 1, can_edit: 1, can_download: 1, can_delete: 1 }
  const effectivePerms = isAdmin ? { can_view: 1, can_upload: 1, can_edit: 1, can_download: 1, can_delete: 1 } : userPerms

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, fontSize: '.85rem', color: 'var(--color-gray-500)' }}>
        <Link to="/projects" style={{ color: 'var(--color-primary)' }}>Projects</Link>
        <ChevronRight size={14} />
        <span>{project.name}</span>
      </div>

      {/* Project header */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ padding: '20px 24px', display: 'flex', gap: 16, alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-lg)', background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FolderOpen size={28} color="var(--color-primary)" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 700 }}>{project.name}</h1>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                <span className="text-xs text-muted">{project.code}</span>
                <span className={`badge ${getStatusBadge(project.status)}`}>{project.status}</span>
                {project.category && <span className="badge badge-blue">{project.category}</span>}
              </div>
              {project.description && <p className="text-sm text-muted" style={{ marginTop: 6 }}>{project.description}</p>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div className="text-center">
              <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{project.doc_count ?? 0}</div>
              <div className="text-xs text-muted">Documents</div>
            </div>
            {isAdmin && (
              <div className="text-center">
                <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{project.member_count ?? 0}</div>
                <div className="text-xs text-muted">Members</div>
              </div>
            )}
            {project.end_date && (
              <div className="text-center">
                <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{formatDate(project.end_date)}</div>
                <div className="text-xs text-muted">Deadline</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.filter(t => isAdmin || t !== 'Members').map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'Documents' && (
        <DocumentsPanel projectId={project.id} permissions={effectivePerms} folders={project.folders || []} onRefresh={load} />
      )}
      {tab === 'Folders' && (
        <FoldersPanel projectId={project.id} folders={project.folders || []} isAdmin={isAdmin} onRefresh={load} />
      )}
      {tab === 'Members' && isAdmin && (
        <MembersPanel projectId={project.id} onRefresh={load} />
      )}
    </div>
  )
}

function FoldersPanel({ projectId, folders, isAdmin, onRefresh }) {
  const [showForm, setShowForm] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [saving, setSaving] = useState(false)

  const createFolder = async () => {
    if (!folderName.trim()) return
    setSaving(true)
    try {
      await projectsApi.createFolder(projectId, { name: folderName })
      toast.success('Folder created.')
      setFolderName(''); setShowForm(false); onRefresh()
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setSaving(false) }
  }

  const deleteFolder = async id => {
    try { await projectsApi.deleteFolder(projectId, id); toast.success('Folder deleted.'); onRefresh() }
    catch (e) { toast.error(getErrorMessage(e)) }
  }

  return (
    <div>
      {isAdmin && (
        <div style={{ marginBottom: 16 }}>
          {showForm ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="form-control" style={{ maxWidth: 280 }} placeholder="Folder name" value={folderName} onChange={e => setFolderName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createFolder()} autoFocus />
              <button className="btn btn-primary btn-sm" onClick={createFolder} disabled={saving}>Add</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          ) : (
            <button className="btn btn-secondary" onClick={() => setShowForm(true)}><Plus size={15} /> New Folder</button>
          )}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        {folders.map(f => (
          <div key={f.id} className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Folder size={28} color={f.color || 'var(--color-primary)'} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="text-sm font-semibold truncate">{f.name}</div>
              <div className="text-xs text-muted">{f.doc_count ?? 0} files</div>
            </div>
            {isAdmin && (
              <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => deleteFolder(f.id)}>×</button>
            )}
          </div>
        ))}
        {folders.length === 0 && (
          <p className="text-muted text-sm">No folders created yet.</p>
        )}
      </div>
    </div>
  )
}
