import { useState, useEffect } from 'react'
import { Star } from 'lucide-react'
import { favoritesApi } from '../../api/misc'
import { formatDate, formatFileSize, getErrorMessage } from '../../utils/helpers'
import FileIcon from '../../components/ui/FileIcon'
import DocumentDetail from '../documents/DocumentDetail'
import Modal from '../../components/ui/Modal'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

export default function FavoritesPage() {
  const { isAdmin } = useAuth()
  const [favs, setFavs]     = useState([])
  const [loading, setLoading] = useState(true)
  const [viewDoc, setViewDoc] = useState(null)

  const load = () => {
    setLoading(true)
    favoritesApi.list()
      .then(r => setFavs(r.data.data || []))
      .catch(() => toast.error('Failed to load favorites'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const removeFav = async docId => {
    try {
      await favoritesApi.toggle(docId)
      setFavs(prev => prev.filter(f => f.document_id !== docId))
      toast.success('Removed from favorites.')
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  const perms = isAdmin
    ? { can_view: 1, can_upload: 1, can_edit: 1, can_download: 1, can_delete: 1 }
    : { can_view: 1, can_upload: 0, can_edit: 0, can_download: 1, can_delete: 0 }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Favorites</h1>
        <p className="page-subtitle">{favs.length} saved document{favs.length !== 1 ? 's' : ''}</p>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : favs.length === 0 ? (
        <div className="empty-state">
          <Star size={40} />
          <h3>No favorites yet</h3>
          <p>Star documents to quickly access them here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {favs.map(f => (
            <div key={f.id} className="card" style={{ padding: '16px', cursor: 'pointer' }}
              onClick={() => setViewDoc(f)}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <FileIcon type={f.file_type} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="font-semibold text-sm truncate">{f.title}</div>
                  <div className="text-xs text-muted truncate">{f.project_name}</div>
                  <div className="text-xs text-muted">{formatFileSize(f.file_size)} · {formatDate(f.created_at)}</div>
                </div>
                <button className="btn btn-ghost btn-icon btn-sm"
                  style={{ color: '#F59E0B', flexShrink: 0 }}
                  onClick={e => { e.stopPropagation(); removeFav(f.document_id) }}
                  title="Remove from favorites">
                  <Star size={16} fill="#F59E0B" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewDoc && (
        <Modal open={!!viewDoc} onClose={() => setViewDoc(null)} title="Document Details" size="lg">
          <DocumentDetail
            doc={{ ...viewDoc, id: viewDoc.document_id }}
            projectId={viewDoc.project_id}
            permissions={perms}
            onClose={() => setViewDoc(null)}
            onRefresh={() => { load(); setViewDoc(null) }}
          />
        </Modal>
      )}
    </div>
  )
}
