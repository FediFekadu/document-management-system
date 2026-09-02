import { useState } from 'react'
import { projectsApi } from '../../api/projects'
import { getErrorMessage } from '../../utils/helpers'
import toast from 'react-hot-toast'

const CATEGORIES = ['University Project', 'Business Project', 'Research Project', 'Company Project', 'Scholarship Application', 'Personal', 'Other']
const STATUSES   = ['active', 'completed', 'archived']

export default function ProjectForm({ project, onSaved, onCancel }) {
  const [form, setForm]       = useState({
    name:        project?.name        || '',
    code:        project?.code        || '',
    description: project?.description || '',
    category:    project?.category    || '',
    start_date:  project?.start_date  || '',
    end_date:    project?.end_date    || '',
    status:      project?.status      || 'active',
  })
  const [errors, setErrors]   = useState({})
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Project name is required.'
    if (!form.code.trim()) e.code = 'Project code is required.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      if (project) {
        await projectsApi.update(project.id, form)
        toast.success('Project updated.')
      } else {
        await projectsApi.create(form)
        toast.success('Project created.')
      }
      onSaved()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Project Name <span className="required">*</span></label>
          <input className={`form-control ${errors.name ? 'error' : ''}`} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. University Project" />
          {errors.name && <div className="form-error">{errors.name}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Project Code <span className="required">*</span></label>
          <input className={`form-control ${errors.code ? 'error' : ''}`} value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="e.g. UNIV-2025" />
          {errors.code && <div className="form-error">{errors.code}</div>}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="form-control" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe the project…" />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Category</label>
          <select className="form-control" value={form.category} onChange={e => set('category', e.target.value)}>
            <option value="">Select category</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-control" value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Start Date</label>
          <input type="date" className="form-control" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">End Date</label>
          <input type="date" className="form-control" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Saving…' : project ? 'Update Project' : 'Create Project'}
        </button>
      </div>
    </form>
  )
}
