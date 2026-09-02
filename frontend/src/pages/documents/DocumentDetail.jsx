import { useState, useEffect } from 'react'
import { Download, Star, Clock, Upload } from 'lucide-react'
import { documentsApi } from '../../api/documents'
import { favoritesApi } from '../../api/misc'
import { formatDateTime, formatFileSize, getErrorMessage } from '../../utils/helpers'
import FileIcon from '../../components/ui/FileIcon'
import toast from 'react-hot-toast'

export default function DocumentDetail({ doc, projectId, permissions, onClose, onRefresh }) {
  const [versions, setVersions]   = useState([])
  const [isFav, setIsFav]         = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [showNewVersion, setShowNewVersion] = useState(false)
  const [versionFile, setVersionFile] = useState(null)
  const [versionNotes, setVersionNotes] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    favoritesApi.list()
      .then(r => setIsFav((r.data.data || []).some(f => f.document_id === doc.id)))
      .catch(() => {})
  }, [doc.id])

  const loadVersions = () => {
    documentsApi.getVersions(projectId, doc.id)
      .then(r => { setVersions(r.data.data || []); setShowVersions(true) })
      .catch(() => toast.error('Failed to load versions'))
  }

  const toggleFav = async () => {
    try {
      const r = await favoritesApi.toggle(doc.id)
      setIsFav(r.data.data?.favorited)
      toast.success(r.data.message)
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  const uploadVersion = async () => {
    if (!versionFile) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', versionFile)
    fd.append('change_notes', versionNotes)
    try {
      await documentsApi.uploadVersion(projectId, doc.id, fd)
      toast.success('New version uploaded.')
      setShowNewVersion(false); setVersionFile(null); setVersionNotes('')
      onRefresh()
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setUploading(false) }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 20 }}>
        <FileIcon type={doc.file_type} size={56} />
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 }}>{doc.title}</h2>
          <div className="text-sm text-muted">{doc.file_name}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <span className="badge badge-blue">{doc.file_type?.toUpperCase()}</span>
            <span className="badge badge-gray">{formatFileSize(doc.file_size)}</span>
            <span className="badge badge-gray">v{doc.version}</span>
            {doc.tags?.map(t => <span key={t} className="badge badge-yellow">{t}</span>)}
          </div>
        </div>
      </div>

      {/* Meta */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20, padding: '16px', background: 'var(--color-gray-50)', borderRadius: 'var(--radius)' }}>
        <div><div className="text-xs text-muted">Project</div><div className="text-sm font-semibold">{doc.project_name}</div></div>
        <div><div className="text-xs text-muted">Folder</div><div className="text-sm">{doc.folder_name || '—'}</div></div>
        <div><div className="text-xs text-muted">Uploaded By</div><div className="text-sm">{doc.uploaded_by_name}</div></div>
        <div><div className="text-xs text-muted">Upload Date</div><div className="text-sm">{formatDateTime(doc.created_at)}</div></div>
        <div><div className="text-xs text-muted">Last Modified</div><div className="text-sm">{formatDateTime(doc.updated_at)}</div></div>
        <div><div className="text-xs text-muted">Views / Downloads</div><div className="text-sm">{doc.view_count} / {doc.download_count}</div></div>
      </div>

      {doc.description && (
        <div style={{ marginBottom: 16 }}>
          <div className="text-xs text-muted" style={{ marginBottom: 4 }}>Description</div>
          <p className="text-sm">{doc.description}</p>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {permissions.can_download && (
          <button
            className="btn btn-primary btn-sm"
            onClick={async () => {
              try { await documentsApi.download(projectId, doc.id, doc.file_name) }
              catch (e) { toast.error('Download failed.') }
            }}
          >
            <Download size={14} /> Download
          </button>
        )}
        <button className="btn btn-secondary btn-sm" onClick={toggleFav}>
          <Star size={14} fill={isFav ? '#F59E0B' : 'none'} color={isFav ? '#F59E0B' : undefined} />
          {isFav ? 'Unfavorite' : 'Favorite'}
        </button>
        {permissions.can_upload && (
          <button className="btn btn-secondary btn-sm" onClick={() => setShowNewVersion(v => !v)}>
            <Upload size={14} /> Upload New Version
          </button>
        )}
        <button className="btn btn-secondary btn-sm" onClick={loadVersions}>
          <Clock size={14} /> Version History
        </button>
      </div>

      {/* Upload new version */}
      {showNewVersion && (
        <div style={{ background: 'var(--color-gray-50)', padding: 16, borderRadius: 'var(--radius)', marginBottom: 16 }}>
          <h4 className="text-sm font-semibold" style={{ marginBottom: 10 }}>Upload New Version</h4>
          <input type="file" className="form-control" style={{ marginBottom: 8 }} onChange={e => setVersionFile(e.target.files[0])} />
          <textarea className="form-control" rows={2} placeholder="Change notes (optional)" value={versionNotes} onChange={e => setVersionNotes(e.target.value)} style={{ marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={uploadVersion} disabled={uploading || !versionFile}>
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowNewVersion(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Version history */}
      {showVersions && (
        <div>
          <h4 className="text-sm font-semibold" style={{ marginBottom: 10 }}>Version History</h4>
          {versions.length === 0
            ? <p className="text-sm text-muted">No versions recorded.</p>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {versions.map(v => (
                  <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--color-gray-50)', borderRadius: 'var(--radius)', border: '1px solid var(--color-gray-200)' }}>
                    <div style={{ fontWeight: 700, color: 'var(--color-primary)', minWidth: 28 }}>v{v.version_number}</div>
                    <div style={{ flex: 1 }}>
                      <div className="text-sm">{v.file_name}</div>
                      <div className="text-xs text-muted">{formatFileSize(v.file_size)} · {v.uploaded_by_name} · {formatDateTime(v.created_at)}</div>
                      {v.change_notes && <div className="text-xs" style={{ marginTop: 2 }}>{v.change_notes}</div>}
                    </div>
                    {permissions.can_download && (
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={async () => {
                          try { await documentsApi.downloadVersion(projectId, doc.id, v.id, v.file_name) }
                          catch (e) { toast.error('Download failed.') }
                        }}
                      >
                        <Download size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )
          }
        </div>
      )}
    </div>
  )
}
