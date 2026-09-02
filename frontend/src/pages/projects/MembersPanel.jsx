import { useState, useEffect } from 'react'
import { projectsApi } from '../../api/projects'
import { usersApi } from '../../api/users'
import { formatDate, getErrorMessage } from '../../utils/helpers'
import { UserPlus, Trash2, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

const PERMS = ['can_view','can_upload','can_edit','can_download','can_delete']
const PERM_LABELS = { can_view: 'View', can_upload: 'Upload', can_edit: 'Edit', can_download: 'Download', can_delete: 'Delete' }

export default function MembersPanel({ projectId, onRefresh }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [removeConfirm, setRemoveConfirm] = useState(null)
  const [allUsers, setAllUsers] = useState([])

  const load = () => {
    setLoading(true)
    projectsApi.getMembers(projectId)
      .then(r => setMembers(r.data.data || []))
      .catch(() => toast.error('Failed to load members'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    usersApi.list({ per_page: 200 })
      .then(r => setAllUsers(r.data.data || []))
      .catch(() => {})
  }, [projectId])

  const togglePerm = async (userId, perm, current) => {
    try {
      await projectsApi.updateMember(projectId, userId, { [perm]: current ? 0 : 1 })
      setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, [perm]: current ? 0 : 1 } : m))
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  const removeMember = async userId => {
    try {
      await projectsApi.removeMember(projectId, userId)
      toast.success('Member removed.')
      load(); onRefresh()
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setRemoveConfirm(null) }
  }

  const existingIds = new Set(members.map(m => m.user_id))
  const availableUsers = allUsers.filter(u => !existingIds.has(u.id) && u.role !== 'admin')

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div><h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Project Members ({members.length})</h3></div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}><UserPlus size={14} /> Add Member</button>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : members.length === 0 ? (
        <div className="empty-state" style={{ padding: 32 }}>
          <p>No members added yet. Add users to grant project access.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>User</th>
                {PERMS.map(p => <th key={p} style={{ textAlign: 'center' }}>{PERM_LABELS[p]}</th>)}
                <th>Status</th>
                <th>Granted</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{m.full_name}</div>
                    <div className="text-xs text-muted">{m.email}</div>
                  </td>
                  {PERMS.map(p => (
                    <td key={p} style={{ textAlign: 'center' }}>
                      <button
                        className={`perm-toggle ${m[p] ? 'perm-on' : 'perm-off'}`}
                        onClick={() => togglePerm(m.user_id, p, m[p])}
                        title={`Toggle ${PERM_LABELS[p]}`}
                      >
                        {m[p] ? <Check size={12} /> : <X size={12} />}
                      </button>
                    </td>
                  ))}
                  <td>
                    <button
                      className={`perm-toggle ${m.is_active ? 'perm-on' : 'perm-off'}`}
                      onClick={() => togglePerm(m.user_id, 'is_active', m.is_active)}
                      title="Toggle active"
                    >
                      {m.is_active ? 'Active' : 'Disabled'}
                    </button>
                  </td>
                  <td className="text-xs text-muted">{formatDate(m.granted_at)}</td>
                  <td>
                    <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-danger)' }}
                      onClick={() => setRemoveConfirm(m)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add member modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Member">
        <AddMemberForm
          projectId={projectId}
          availableUsers={availableUsers}
          onAdded={() => { setShowAdd(false); load(); onRefresh() }}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>

      <ConfirmDialog
        open={!!removeConfirm}
        onClose={() => setRemoveConfirm(null)}
        onConfirm={() => removeMember(removeConfirm?.user_id)}
        title="Remove Member"
        message={`Remove ${removeConfirm?.full_name} from this project?`}
        danger
      />
    </div>
  )
}

function AddMemberForm({ projectId, availableUsers, onAdded, onCancel }) {
  const [userId, setUserId] = useState('')
  const [perms, setPerms]   = useState({ can_view: 1, can_upload: 0, can_edit: 0, can_download: 0, can_delete: 0 })
  const [saving, setSaving] = useState(false)

  const toggle = p => setPerms(prev => ({ ...prev, [p]: prev[p] ? 0 : 1 }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!userId) { toast.error('Please select a user.'); return }
    setSaving(true)
    try {
      await projectsApi.addMember(projectId, { user_id: parseInt(userId), ...perms })
      toast.success('Member added.')
      onAdded()
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Select User <span className="required">*</span></label>
        <select className="form-control" value={userId} onChange={e => setUserId(e.target.value)}>
          <option value="">Choose a user…</option>
          {availableUsers.map(u => (
            <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.username})</option>
          ))}
        </select>
        {availableUsers.length === 0 && <div className="form-hint">All users are already members.</div>}
      </div>

      <div className="form-group">
        <label className="form-label">Permissions</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
          {PERMS.map(p => (
            <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}>
              <input type="checkbox" checked={!!perms[p]} onChange={() => toggle(p)} />
              <span className="text-sm">{PERM_LABELS[p]}</span>
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving || !userId}>
          {saving ? 'Adding…' : 'Add Member'}
        </button>
      </div>
    </form>
  )
}
