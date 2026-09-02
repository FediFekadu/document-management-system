import { useState } from 'react'
import { usersApi } from '../../api/users'
import { getErrorMessage } from '../../utils/helpers'
import toast from 'react-hot-toast'

export default function UserForm({ user, onSaved, onCancel }) {
  const [form, setForm]     = useState({
    first_name:  user?.first_name  || '',
    last_name:   user?.last_name   || '',
    email:       user?.email       || '',
    username:    user?.username    || '',
    password:    '',
    role:        user?.role        || 'user',
    phone:       user?.phone       || '',
    department:  user?.department  || '',
    position:    user?.position    || '',
    is_active:   user !== undefined ? (user?.is_active ? '1' : '0') : '1',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const validate = () => {
    const e = {}
    if (!form.first_name.trim()) e.first_name = 'Required.'
    if (!form.last_name.trim())  e.last_name  = 'Required.'
    if (!form.email.trim())      e.email      = 'Required.'
    if (!form.username.trim())   e.username   = 'Required.'
    if (!user && !form.password) e.password   = 'Required for new users.'
    if (form.password && form.password.length < 8) e.password = 'Minimum 8 characters.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const payload = { ...form, is_active: parseInt(form.is_active) }
      if (!payload.password) delete payload.password
      if (user) await usersApi.update(user.id, payload)
      else await usersApi.create(payload)
      toast.success(user ? 'User updated.' : 'User created.')
      onSaved()
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">First Name <span className="required">*</span></label>
          <input className={`form-control ${errors.first_name ? 'error' : ''}`} value={form.first_name} onChange={e => set('first_name', e.target.value)} />
          {errors.first_name && <div className="form-error">{errors.first_name}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Last Name <span className="required">*</span></label>
          <input className={`form-control ${errors.last_name ? 'error' : ''}`} value={form.last_name} onChange={e => set('last_name', e.target.value)} />
          {errors.last_name && <div className="form-error">{errors.last_name}</div>}
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Email <span className="required">*</span></label>
          <input type="email" className={`form-control ${errors.email ? 'error' : ''}`} value={form.email} onChange={e => set('email', e.target.value)} />
          {errors.email && <div className="form-error">{errors.email}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Username <span className="required">*</span></label>
          <input className={`form-control ${errors.username ? 'error' : ''}`} value={form.username} onChange={e => set('username', e.target.value)} />
          {errors.username && <div className="form-error">{errors.username}</div>}
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Password {user ? '(leave blank to keep)' : <span className="required">*</span>}</label>
          <input type="password" className={`form-control ${errors.password ? 'error' : ''}`} value={form.password} onChange={e => set('password', e.target.value)} placeholder={user ? '••••••••' : 'Min 8 characters'} />
          {errors.password && <div className="form-error">{errors.password}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Role</label>
          <select className="form-control" value={form.role} onChange={e => set('role', e.target.value)}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Phone</label>
          <input className="form-control" value={form.phone} onChange={e => set('phone', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Department</label>
          <input className="form-control" value={form.department} onChange={e => set('department', e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Position</label>
          <input className="form-control" value={form.position} onChange={e => set('position', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-control" value={form.is_active} onChange={e => set('is_active', e.target.value)}>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving…' : user ? 'Update User' : 'Create User'}</button>
      </div>
    </form>
  )
}
