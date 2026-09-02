import { useState, useEffect } from 'react'
import { projectsApi } from '../../api/projects'
import { documentsApi } from '../../api/documents'
import { formatDate, formatFileSize, getErrorMessage } from '../../utils/helpers'
import { RefreshCw, Trash2 } from 'lucide-react'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import toast from 'react-hot-toast'

export default function ArchivePage() {
  const [tab, setTab] = useState('projects')
  const [archivedProjects, setArchivedProjects] = useState([])
  const [projects, setProjects] = useState([])  // for doc lookup
  const [confirm, setConfirm] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    if (tab === 'projects') {
      projectsApi.list({ status: 'archived', per_page: 100 })
        .then(r => setArchivedProjects(r.data.data || []))
        .catch(() => toast.error('Failed to load'))
        .finally(() => setLoading(false))
    } else {
      // Load all projects to show archived docs
      projectsApi.list({ per_page: 200 })
        .then(r => setProjects(r.data.data || []))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [tab])

  const restoreProject = async id => {
    try { await projectsApi.restore(id); toast.success('Project restored.'); setArchivedProjects(p => p.filter(x => x.id !== id)) }
    catch (e) { toast.error(getErrorMessage(e)) }
  }

  const deleteProject = async id => {
    try { await projectsApi.delete(id); toast.success('Project deleted.'); setArchivedProjects(p => p.filter(x => x.id !== id)) }
    catch (e) { toast.error(getErrorMessage(e)) }
    finally { setConfirm(null) }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Archive</h1>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'projects' ? 'active' : ''}`} onClick={() => setTab('projects')}>Archived Projects</button>
        <button className={`tab ${tab === 'documents' ? 'active' : ''}`} onClick={() => setTab('documents')}>Archived Documents</button>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : tab === 'projects' ? (
        <div className="card">
          <div className="table-container">
            <table>
              <thead><tr><th>Project</th><th>Code</th><th>Documents</th><th>Archived</th><th></th></tr></thead>
              <tbody>
                {archivedProjects.length === 0
                  ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--color-gray-400)' }}>No archived projects.</td></tr>
                  : archivedProjects.map(p => (
                    <tr key={p.id}>
                      <td><div className="font-semibold">{p.name}</div><div className="text-xs text-muted">{p.description?.slice(0, 60)}</div></td>
                      <td className="text-sm">{p.code}</td>
                      <td className="text-sm">{p.doc_count ?? 0}</td>
                      <td className="text-xs text-muted">{formatDate(p.archived_at)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => restoreProject(p.id)}><RefreshCw size={13} /> Restore</button>
                          <button className="btn btn-danger btn-sm" onClick={() => setConfirm({ type: 'project', id: p.id, name: p.name })}><Trash2 size={13} /> Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div>
          {projects.length === 0 ? (
            <p className="text-muted">No projects available.</p>
          ) : (
            projects.map(p => <ArchivedDocsSection key={p.id} project={p} />)
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => deleteProject(confirm?.id)}
        title="Delete Project Permanently"
        message={`Permanently delete "${confirm?.name}" and all its documents?`}
        danger
      />
    </div>
  )
}

function ArchivedDocsSection({ project }) {
  const [docs, setDocs] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)

  const load = () => {
    if (loaded) return
    documentsApi.getArchived(project.id)
      .then(r => { setDocs(r.data.data || []); setLoaded(true) })
      .catch(() => {})
  }

  const toggle = () => { if (!open) load(); setOpen(v => !v) }

  const restore = async id => {
    try { await documentsApi.restore(project.id, id); toast.success('Restored.'); setDocs(p => p.filter(d => d.id !== id)) }
    catch (e) { toast.error(getErrorMessage(e)) }
  }

  if (!open && !loaded) {
    return (
      <div className="card" style={{ marginBottom: 10 }}>
        <button style={{ width: '100%', padding: '12px 20px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '.875rem', fontWeight: 600 }} onClick={toggle}>
          📁 {project.name} — click to load archived documents
        </button>
      </div>
    )
  }

  return docs.length > 0 ? (
    <div className="card" style={{ marginBottom: 10 }}>
      <div className="card-header"><h3 className="card-title">{project.name}</h3></div>
      <div className="table-container">
        <table>
          <thead><tr><th>Document</th><th>Size</th><th>Archived</th><th></th></tr></thead>
          <tbody>
            {docs.map(d => (
              <tr key={d.id}>
                <td><div className="font-semibold text-sm">{d.title}</div><div className="text-xs text-muted">{d.file_name}</div></td>
                <td className="text-sm">{formatFileSize(d.file_size)}</td>
                <td className="text-xs text-muted">{formatDate(d.archived_at)}</td>
                <td><button className="btn btn-secondary btn-sm" onClick={() => restore(d.id)}><RefreshCw size={13} /> Restore</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  ) : null
}
