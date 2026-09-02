import { useState, useEffect, useCallback } from 'react'
import { activityApi } from '../../api/misc'
import { formatDateTime, getErrorMessage } from '../../utils/helpers'
import Pagination from '../../components/ui/Pagination'
import toast from 'react-hot-toast'

const ACTION_COLORS = {
  login: 'badge-green', logout: 'badge-gray', login_failed: 'badge-red',
  upload_document: 'badge-blue', download_document: 'badge-yellow',
  delete_document: 'badge-red', archive_document: 'badge-gray',
  create_project: 'badge-blue', delete_project: 'badge-red',
  grant_access: 'badge-green', revoke_access: 'badge-red',
  update_permissions: 'badge-yellow',
}

export default function ActivityPage() {
  const [logs, setLogs]       = useState([])
  const [pagination, setPag]  = useState({ total: 0, last_page: 1, current_page: 1 })
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(1)
  const [filters, setFilters] = useState({ from: '', to: '', action: '' })

  const load = useCallback(() => {
    setLoading(true)
    activityApi.list({ page, per_page: 50, ...filters })
      .then(r => {
        const d = r.data
        setLogs(Array.isArray(d.data) ? d.data : [])
        setPag(d.pagination || { total:0, last_page:1, current_page:1 })
      })
      .catch(() => toast.error('Failed to load activity'))
      .finally(() => setLoading(false))
  }, [page, filters])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Activity Log</h1>
          <p className="page-subtitle">{pagination.total} entries</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input type="date" className="form-control" style={{ width: 160 }} value={filters.from}
          onChange={e => { setFilters(p => ({ ...p, from: e.target.value })); setPage(1) }} />
        <input type="date" className="form-control" style={{ width: 160 }} value={filters.to}
          onChange={e => { setFilters(p => ({ ...p, to: e.target.value })); setPage(1) }} />
        <select className="form-control" style={{ width: 200 }} value={filters.action}
          onChange={e => { setFilters(p => ({ ...p, action: e.target.value })); setPage(1) }}>
          <option value="">All Actions</option>
          {Object.keys(ACTION_COLORS).map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
        </select>
        <button className="btn btn-secondary" onClick={() => { setFilters({ from: '', to: '', action: '' }); setPage(1) }}>Clear</button>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Description</th>
                  <th>Date</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0
                  ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--color-gray-400)' }}>No activity found.</td></tr>
                  : logs.map(l => (
                    <tr key={l.id}>
                      <td>
                        <div className="font-semibold text-sm">{l.user_name}</div>
                        <div className="text-xs text-muted">{l.username}</div>
                      </td>
                      <td><span className={`badge ${ACTION_COLORS[l.action] || 'badge-gray'}`}>{l.action.replace(/_/g, ' ')}</span></td>
                      <td className="text-sm">{l.entity_name || '—'}</td>
                      <td className="text-sm text-muted">{l.description || '—'}</td>
                      <td className="text-xs text-muted" style={{ whiteSpace: 'nowrap' }}>{formatDateTime(l.created_at)}</td>
                      <td className="text-xs text-muted">{l.ip_address || '—'}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Pagination page={pagination.current_page} lastPage={pagination.last_page} onPageChange={setPage} />
    </div>
  )
}
