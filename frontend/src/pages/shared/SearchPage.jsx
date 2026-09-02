import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { documentsApi } from '../../api/documents'
import { formatDate, formatFileSize } from '../../utils/helpers'
import FileIcon from '../../components/ui/FileIcon'
import DocumentDetail from '../documents/DocumentDetail'
import Modal from '../../components/ui/Modal'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAdmin } = useAuth()
  const [query, setQuery]     = useState(searchParams.get('q') || '')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [viewDoc, setViewDoc] = useState(null)

  const doSearch = async (q = query) => {
    if (!q.trim()) return
    setSearched(true)
    setLoading(true)
    try {
      const r = await documentsApi.search({ q })
      setResults(r.data.data || [])
    } catch { toast.error('Search failed.') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) { setQuery(q); doSearch(q) }
  }, [])

  const handleSubmit = e => {
    e.preventDefault()
    setSearchParams({ q: query })
    doSearch()
  }

  const perms = isAdmin
    ? { can_view: 1, can_upload: 1, can_edit: 1, can_download: 1, can_delete: 1 }
    : { can_view: 1, can_upload: 0, can_edit: 0, can_download: 1, can_delete: 0 }

  return (
    <div>
      <div style={{ maxWidth: 600, margin: '0 auto 32px' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="search-bar" style={{ flex: 1 }}>
              <Search size={16} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search documents, projects, tags…"
                style={{ fontSize: '1rem' }}
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn-primary">Search</button>
          </div>
        </form>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : searched && (
        <>
          <p className="text-muted text-sm" style={{ marginBottom: 12 }}>
            {results.length === 0 ? 'No results found.' : `${results.length} result${results.length !== 1 ? 's' : ''} for "${searchParams.get('q')}"`}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.map(doc => (
              <div key={doc.id} className="card" style={{ padding: '14px 18px', cursor: 'pointer', transition: 'box-shadow .15s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
                onClick={() => setViewDoc(doc)}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <FileIcon type={doc.file_type} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="font-semibold">{doc.title}</div>
                    <div className="text-xs text-muted">{doc.file_name} · {formatFileSize(doc.file_size)}</div>
                    {doc.description && <div className="text-sm text-muted" style={{ marginTop: 2 }}>{doc.description.slice(0, 100)}</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>{doc.project_name}</div>
                    <div className="text-xs text-muted">{formatDate(doc.created_at)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {viewDoc && (
        <Modal open={!!viewDoc} onClose={() => setViewDoc(null)} title="Document Details" size="lg">
          <DocumentDetail doc={viewDoc} projectId={viewDoc.project_id} permissions={perms}
            onClose={() => setViewDoc(null)} onRefresh={() => { doSearch(); setViewDoc(null) }} />
        </Modal>
      )}
    </div>
  )
}
