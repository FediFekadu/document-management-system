import { useState, useRef } from 'react'
import { Upload, X, FileText } from 'lucide-react'
import { documentsApi } from '../../api/documents'
import { formatFileSize, getErrorMessage } from '../../utils/helpers'
import toast from 'react-hot-toast'

const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.zip,.rar'

export default function UploadForm({ projectId, folders, onUploaded, onCancel }) {
  const [file, setFile]         = useState(null)
  const [form, setForm]         = useState({ title: '', description: '', folder_id: '', tags: '', access_level: 'project' })
  const [progress, setProgress] = useState(0)
  const [loading, setLoading]   = useState(false)
  const fileRef = useRef()

  const handleFile = f => {
    setFile(f)
    if (!form.title) setForm(p => ({ ...p, title: f.name.replace(/\.[^.]+$/, '') }))
  }

  const handleDrop = e => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!file) { toast.error('Please select a file.'); return }
    setLoading(true)

    const fd = new FormData()
    fd.append('file', file)
    fd.append('title', form.title || file.name)
    fd.append('description', form.description)
    fd.append('folder_id', form.folder_id)
    fd.append('tags', form.tags)
    fd.append('access_level', form.access_level)

    try {
      await documentsApi.upload(projectId, fd)
      toast.success('Document uploaded successfully.')
      onUploaded()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false); setProgress(0)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Drop zone */}
      <div
        style={{
          border: `2px dashed ${file ? 'var(--color-primary)' : 'var(--color-gray-300)'}`,
          borderRadius: 'var(--radius-lg)', padding: 32, textAlign: 'center',
          background: file ? 'var(--color-primary-light)' : 'var(--color-gray-50)',
          cursor: 'pointer', marginBottom: 16, transition: 'all .2s',
        }}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
      >
        {file ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
            <FileText size={32} color="var(--color-primary)" />
            <div style={{ textAlign: 'left' }}>
              <div className="font-semibold">{file.name}</div>
              <div className="text-sm text-muted">{formatFileSize(file.size)}</div>
            </div>
            <button type="button" className="btn btn-ghost btn-icon" onClick={e => { e.stopPropagation(); setFile(null) }}><X size={16} /></button>
          </div>
        ) : (
          <>
            <Upload size={36} color="var(--color-gray-400)" style={{ margin: '0 auto 10px' }} />
            <p className="text-sm font-semibold">Drop file here or click to browse</p>
            <p className="text-xs text-muted" style={{ marginTop: 4 }}>PDF, DOC, XLS, PPT, TXT, Images, ZIP — max 50MB</p>
          </>
        )}
        <input ref={fileRef} type="file" accept={ACCEPT} style={{ display: 'none' }} onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Document Title</label>
          <input className="form-control" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Enter title" />
        </div>
        {folders.length > 0 && (
          <div className="form-group">
            <label className="form-label">Folder</label>
            <select className="form-control" value={form.folder_id} onChange={e => setForm(p => ({ ...p, folder_id: e.target.value }))}>
              <option value="">No folder</option>
              {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="form-control" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Tags</label>
          <input className="form-control" value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="tag1, tag2, tag3" />
          <div className="form-hint">Comma-separated tags</div>
        </div>
        <div className="form-group">
          <label className="form-label">Access Level</label>
          <select className="form-control" value={form.access_level} onChange={e => setForm(p => ({ ...p, access_level: e.target.value }))}>
            <option value="project">All project members</option>
            <option value="restricted">Restricted</option>
          </select>
        </div>
      </div>

      {loading && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ background: 'var(--color-gray-200)', borderRadius: 4, overflow: 'hidden', height: 6 }}>
            <div style={{ background: 'var(--color-primary)', width: '100%', height: '100%', animation: 'pulse 1.5s infinite' }} />
          </div>
          <div className="text-xs text-muted" style={{ marginTop: 4 }}>Uploading…</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading || !file}>
          <Upload size={15} /> {loading ? 'Uploading…' : 'Upload'}
        </button>
      </div>
    </form>
  )
}
