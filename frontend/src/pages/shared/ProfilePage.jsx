import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usersApi } from '../../api/users'
import { authApi } from '../../api/auth'
import { formatDate, getErrorMessage } from '../../utils/helpers'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()

  const [form, setForm] = useState({
    first_name:  user?.first_name  || '',
    last_name:   user?.last_name   || '',
    email:       user?.email       || '',
    username:    user?.username    || '',
    phone:       user?.phone       || '',
    department:  user?.department  || '',
    position:    user?.position    || '',
  })
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [saving, setSaving] = useState(false)
  const [savingPw, setSavingPw] = useState(false)

  const handleProfile = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      await usersApi.updateProfile(form)
      await refreshUser()
      toast.success('Profile updated.')
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setSaving(false) }
  }

  const handlePassword = async e => {
    e.preventDefault()
    if (pwForm.new_password !== pwForm.confirm_password) { toast.error('Passwords do not match.'); return }
    if (pwForm.new_password.length < 8) { toast.error('Password must be at least 8 characters.'); return }
    setSavingPw(true)
    try {
      await authApi.changePassword({ current_password: pwForm.current_password, new_password: pwForm.new_password })
      toast.success('Password changed.')
      setPwForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setSavingPw(false) }
  }

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Avatar header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28, padding: '20px 24px', background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-gray-200)' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: user?.role === 'admin' ? 'var(--color-danger-light)' : 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, color: user?.role === 'admin' ? 'var(--color-danger)' : 'var(--color-primary)' }}>
          {user?.first_name?.[0]}{user?.last_name?.[0]}
        </div>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{user?.first_name} {user?.last_name}</h2>
          <div className="text-sm text-muted">@{user?.username}</div>
          <span className={`badge ${user?.role === 'admin' ? 'badge-red' : 'badge-blue'}`} style={{ marginTop: 6 }}>{user?.role}</span>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div className="text-xs text-muted">Last login</div>
          <div className="text-sm">{formatDate(user?.last_login) || 'Never'}</div>
        </div>
      </div>

      {/* Profile form */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h3 className="card-title">Personal Information</h3></div>
        <div className="card-body">
          <form onSubmit={handleProfile}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input className="form-control" value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input className="form-control" value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-control" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input className="form-control" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-control" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <input className="form-control" value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Position</label>
              <input className="form-control" value={form.position} onChange={e => setForm(p => ({ ...p, position: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </form>
        </div>
      </div>

      {/* Change password */}
      <div className="card">
        <div className="card-header"><h3 className="card-title">Change Password</h3></div>
        <div className="card-body">
          <form onSubmit={handlePassword}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input type="password" className="form-control" value={pwForm.current_password} onChange={e => setPwForm(p => ({ ...p, current_password: e.target.value }))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input type="password" className="form-control" value={pwForm.new_password} onChange={e => setPwForm(p => ({ ...p, new_password: e.target.value }))} placeholder="Min 8 characters" />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input type="password" className="form-control" value={pwForm.confirm_password} onChange={e => setPwForm(p => ({ ...p, confirm_password: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={savingPw}>{savingPw ? 'Saving…' : 'Change Password'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
