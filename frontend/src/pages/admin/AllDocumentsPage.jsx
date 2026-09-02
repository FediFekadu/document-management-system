import { useState, useEffect, useCallback } from 'react'
import { Search } from 'lucide-react'
import { documentsApi } from '../../api/documents'
import { projectsApi } from '../../api/projects'
import { formatDate, formatFileSize, debounce } from '../../utils/helpers'
import FileIcon from '../../components/ui/FileIcon'
import Pagination from '../../components/ui/Pagination'
import DocumentDetail from '../documents/DocumentDetail'
import Modal from '../../components/ui/Modal'
import toast from 'react-hot-toast'

export default function AllDocumentsPage() {
  const [projectId, setProjectId] = useState('')
  const [projects, setProjects]   = useState([])
  const [docs, setDocs]           = useState([])
  const [pagination, setPag]      = useState({ total: 0, last_page: 1, current_page: 1 })
  const [loading, setLoading]     = useState(false)
  const [search, setSearch]       = useState('')
  const [page, setPage]           = useState(1)
  const [viewDoc, setViewDoc]     = useState(null)

  useEffect(() => {
    projectsApi.list({ per_page: 200 })
      .then(r => setProjects(r.data.data || []))
      .catch(() => {})
  }, [])

  const load = useCallback(() => {
    if (!projectId) return
    setLoading(true)
    documentsApi.list(projectId, { page, search })
      .then(r => { setDocs(r.data.data || []); setPag(r.data.pagination || {}) })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }, [projectId, page, search])

  useEffect(() => { load() }, [load])
  const debouncedSearch = useCallback(debounce(v => { setSearch(v); setPage(1) }, 400), [])

  const adminPerms = { can_view: 1, can_upload: 1, can_edit: 1, can_download: 1, can_delete: 1 }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">All Documents</h1>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <select className="form-control" style={{ width: 240 }} value={projectId} onChange={e => { setProjectId(e.target.value); setPage(1) }}>
          <option value="">Select a project…</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <Search size={15} />
          <input placeholder="Search documents…" onChange={e => debouncedSearch(e.target.value)} />
        </div>
      </div>

      {!projectId ? (
        <div className="empty-state"><p>Select a project to view its documents.</p></div>
      ) : loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : (
        <>
          <div className="card">
            <div className="table-container">
              <table>
                <thead><tr><th>Document</th><th>Folder</th><th>Uploaded By</th><th>Size</th><th>Date</th><th>v</th></tr></thead>
                <tbody>
                  {docs.length === 0
                    ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--color-gray-400)' }}>No documents.</td></tr>
                    : docs.map(d => (
                      <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => setViewDoc(d)}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <FileIcon type={d.file_type} size={32} />
                            <div>
                              <div className="font-semibold text-sm">{d.title}</div>
                              <div className="text-xs text-muted">{d.file_name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-xs text-muted">{d.folder_name || '—'}</td>
                        <td className="text-sm">{d.uploaded_by_name}</td>
                        <td className="text-sm">{formatFileSize(d.file_size)}</td>
                        <td className="text-sm">{formatDate(d.created_at)}</td>
                        <td className="text-sm text-muted">v{d.version}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
          <Pagination page={pagination.current_page} lastPage={pagination.last_page} onPageChange={setPage} />
        </>
      )}

      {viewDoc && (
        <Modal open={!!viewDoc} onClose={() => setViewDoc(null)} title="Document Details" size="lg">
          <DocumentDetail doc={viewDoc} projectId={parseInt(projectId)} permissions={adminPerms} onClose={() => setViewDoc(null)} onRefresh={() => { load(); setViewDoc(null) }} />
        </Modal>
      )}
    </div>
  )
}
