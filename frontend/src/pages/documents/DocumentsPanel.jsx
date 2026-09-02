import { useState, useEffect, useCallback } from 'react'
import { Upload, Search, Download, Archive, Trash2, Eye, Star, Clock, MoreVertical, Filter } from 'lucide-react'
import { documentsApi } from '../../api/documents'
import { favoritesApi } from '../../api/misc'
import { formatDate, formatFileSize, getErrorMessage, debounce } from '../../utils/helpers'
import FileIcon from '../../components/ui/FileIcon'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Pagination from '../../components/ui/Pagination'
import UploadForm from './UploadForm'
import DocumentDetail from './DocumentDetail'
import toast from 'react-hot-toast'

export default function DocumentsPanel({ projectId, permissions, folders, onRefresh }) {
  const [docs, setDocs]           = useState([])
  const [pagination, setPag]      = useState({ total: 0, last_page: 1, current_page: 1 })
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [folderId, setFolderId]   = useState(null)
  const [page, setPage]           = useState(1)
  const [showUpload, setShowUpload] = useState(false)
  const [viewDoc, setViewDoc]     = useState(null)
  const [confirm, setConfirm]     = useState(null)
  const [openMenu, setOpenMenu]   = useState(null)
  const [favorites, setFavorites] = useState(new Set())

  const load = useCallback(() => {
    setLoading(true)
    documentsApi.list(projectId, { page, search, folder_id: folderId })
      .then(r => {
        setDocs(r.data.data || [])
        setPag(r.data.pagination || { total: 0, last_page: 1, current_page: 1 })
      })
      .catch(() => toast.error('Failed to load documents'))
      .finally(() => setLoading(false))
  }, [projectId, page, search, folderId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    favoritesApi.list()
      .then(r => setFavorites(new Set((r.data.data || []).map(f => f.document_id))))
      .catch(() => {})
  }, [])

  const debouncedSearch = useCallback(debounce(v => { setSearch(v); setPage(1) }, 400), [])

  const handleDownload = async (doc) => {
    try {
      await documentsApi.download(projectId, doc.id, doc.file_name)
    } catch (e) {
      toast.error(getErrorMessage(e) || 'Download failed.')
    }
  }

  const toggleFav = async (docId) => {
    try {
      const r = await favoritesApi.toggle(docId)
      setFavorites(prev => {
        const next = new Set(prev)
        r.data.data?.favorited ? next.add(docId) : next.delete(docId)
        return next
      })
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  const handleArchive = async () => {
    try {
      await documentsApi.archive(projectId, confirm.id)
      toast.success('Document archived.')
      load()
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setConfirm(null) }
  }

  const handleDelete = async () => {
    try {
      await documentsApi.delete(projectId, confirm.id)
      toast.success('Document deleted.')
      load()
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setConfirm(null) }
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <Search size={15} />
          <input placeholder="Search documents…" onChange={e => debouncedSearch(e.target.value)} />
        </div>
        {folders.length > 0 && (
          <select className="form-control" style={{ width: 160 }} value={folderId ?? ''} onChange={e => { setFolderId(e.target.value || null); setPage(1) }}>
            <option value="">All Folders</option>
            {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        )}
        {permissions.can_upload && (
          <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
            <Upload size={15} /> Upload
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : docs.length === 0 ? (
        <div className="empty-state">
          <Upload size={40} />
          <h3>No documents found</h3>
          <p>{permissions.can_upload ? 'Upload the first document to this project.' : 'No documents available.'}</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Folder</th>
                  <th>Uploaded By</th>
                  <th>Size</th>
                  <th>Date</th>
                  <th>Ver.</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {docs.map(doc => (
                  <tr key={doc.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <FileIcon type={doc.file_type} size={36} />
                        <div>
                          <div className="font-semibold text-sm" style={{ cursor: 'pointer', color: 'var(--color-primary)' }} onClick={() => setViewDoc(doc)}>
                            {doc.title}
                          </div>
                          <div className="text-xs text-muted">{doc.file_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-xs text-muted">{doc.folder_name || '—'}</td>
                    <td className="text-sm">{doc.uploaded_by_name}</td>
                    <td className="text-sm">{formatFileSize(doc.file_size)}</td>
                    <td className="text-sm">{formatDate(doc.created_at)}</td>
                    <td className="text-sm text-muted">v{doc.version}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setViewDoc(doc)} title="View"><Eye size={14} /></button>
                        {permissions.can_download && (
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDownload(doc)} title="Download"><Download size={14} /></button>
                        )}
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => toggleFav(doc.id)} title="Favorite"
                          style={{ color: favorites.has(doc.id) ? '#F59E0B' : 'var(--color-gray-400)' }}>
                          <Star size={14} fill={favorites.has(doc.id) ? '#F59E0B' : 'none'} />
                        </button>
                        {(permissions.can_delete) && (
                          <div className="dropdown">
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === doc.id ? null : doc.id) }}>
                              <MoreVertical size={14} />
                            </button>
                            {openMenu === doc.id && (
                              <div className="dropdown-menu" onClick={e => e.stopPropagation()}>
                                <button className="dropdown-item" onClick={() => { setConfirm({ type: 'archive', id: doc.id, title: doc.title }); setOpenMenu(null) }}>
                                  <Archive size={13} /> Archive
                                </button>
                                <button className="dropdown-item danger" onClick={() => { setConfirm({ type: 'delete', id: doc.id, title: doc.title }); setOpenMenu(null) }}>
                                  <Trash2 size={13} /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={pagination.current_page} lastPage={pagination.last_page} onPageChange={setPage} />
        </>
      )}

      {/* Upload modal */}
      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Upload Document" size="lg">
        <UploadForm
          projectId={projectId}
          folders={folders}
          onUploaded={() => { setShowUpload(false); load() }}
          onCancel={() => setShowUpload(false)}
        />
      </Modal>

      {/* Document detail modal */}
      {viewDoc && (
        <Modal open={!!viewDoc} onClose={() => setViewDoc(null)} title="Document Details" size="lg">
          <DocumentDetail
            doc={viewDoc}
            projectId={projectId}
            permissions={permissions}
            onClose={() => setViewDoc(null)}
            onRefresh={() => { load(); setViewDoc(null) }}
          />
        </Modal>
      )}

      {/* Confirm */}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={confirm?.type === 'delete' ? handleDelete : handleArchive}
        title={confirm?.type === 'delete' ? 'Delete Document' : 'Archive Document'}
        message={`${confirm?.type === 'delete' ? 'Permanently delete' : 'Archive'} "${confirm?.title}"?`}
        danger={confirm?.type === 'delete'}
      />
    </div>
  )
}
