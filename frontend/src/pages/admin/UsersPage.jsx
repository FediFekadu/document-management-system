import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Edit, Trash2, UserCheck, UserX } from 'lucide-react'
import { usersApi } from '../../api/users'
import { formatDate, getErrorMessage, debounce } from '../../utils/helpers'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Pagination from '../../components/ui/Pagination'
import UserForm from './UserForm'
import toast from 'react-hot-toast'

export default function UsersPage() {
  const [users, setUsers]         = useState([])
  const [pagination, setPag]      = useState({ total:0, last_page:1, current_page:1 })
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [page, setPage]           = useState(1)
  const [showForm, setShowForm]   = useState(false)
  const [editUser, setEditUser]   = useState(null)
  const [confirm, setConfirm]     = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    usersApi.list({ page, search })
      .then(r => {
        const d = r.data
        setUsers(Array.isArray(d.data) ? d.data : [])
        setPag(d.pagination || { total: Array.isArray(d.data) ? d.data.length : 0, last_page:1, current_page:1 })
      })
      .catch(e => toast.error(getErrorMessage(e) || 'Failed to load users'))
      .finally(() => setLoading(false))
  }, [page, search])

  useEffect(() => { load() }, [load])

  const debouncedSearch = useCallback(debounce(v => { setSearch(v); setPage(1) }, 400), [])

  const handleSaved = () => { setShowForm(false); setEditUser(null); load() }

  const handleDelete = async () => {
    try { await usersApi.delete(confirm.id); toast.success('User deleted.'); load() }
    catch (e) { toast.error(getErrorMessage(e)) }
    finally { setConfirm(null) }
  }

  const toggleActive = async user => {
    try {
      await usersApi.update(user.id, { is_active: user.is_active ? 0 : 1 })
      toast.success(`User ${user.is_active ? 'deactivated' : 'activated'}.`)
      load()
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">{pagination.total} users</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditUser(null); setShowForm(true) }}>
          <Plus size={16} /> Add User
        </button>
      </div>

      <div style={{ display:'flex', gap:10, marginBottom:20 }}>
        <div className="search-bar" style={{ flex:1, maxWidth:400 }}>
          <Search size={15} />
          <input placeholder="Search by name, email, username…"
            onChange={e => debouncedSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>User</th><th>Username</th><th>Role</th>
                  <th>Department</th><th>Status</th><th>Last Login</th><th>Created</th><th></th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign:'center', padding:32, color:'var(--color-gray-400)' }}>
                    No users found.
                  </td></tr>
                ) : users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{
                          width:34, height:34, borderRadius:'50%',
                          background: u.role === 'admin' ? 'var(--color-danger-light)' : 'var(--color-primary-light)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:'.75rem', fontWeight:700,
                          color: u.role === 'admin' ? 'var(--color-danger)' : 'var(--color-primary)',
                          flexShrink:0
                        }}>
                          {u.first_name?.[0]}{u.last_name?.[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{u.first_name} {u.last_name}</div>
                          <div className="text-xs text-muted">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm">{u.username}</td>
                    <td><span className={`badge ${u.role === 'admin' ? 'badge-red' : 'badge-blue'}`}>{u.role}</span></td>
                    <td className="text-sm text-muted">{u.department || '—'}</td>
                    <td><span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span></td>
                    <td className="text-xs text-muted">{u.last_login ? formatDate(u.last_login) : 'Never'}</td>
                    <td className="text-xs text-muted">{formatDate(u.created_at)}</td>
                    <td>
                      <div style={{ display:'flex', gap:4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Edit"
                          onClick={() => { setEditUser(u); setShowForm(true) }}>
                          <Edit size={14} />
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm"
                          title={u.is_active ? 'Deactivate' : 'Activate'}
                          onClick={() => toggleActive(u)}>
                          {u.is_active
                            ? <UserX size={14} color="var(--color-warning)" />
                            : <UserCheck size={14} color="var(--color-success)" />}
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Delete"
                          style={{ color:'var(--color-danger)' }}
                          onClick={() => setConfirm(u)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={pagination.current_page} lastPage={pagination.last_page} onPageChange={setPage} />

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditUser(null) }}
        title={editUser ? 'Edit User' : 'Add User'} size="lg">
        <UserForm user={editUser} onSaved={handleSaved}
          onCancel={() => { setShowForm(false); setEditUser(null) }} />
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={handleDelete}
        title="Delete User"
        message={`Permanently delete ${confirm?.first_name} ${confirm?.last_name}? This cannot be undone.`}
        danger />
    </div>
  )
}
