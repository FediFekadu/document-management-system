import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, FolderOpen, MoreVertical, Archive, Trash2, Edit, Users } from 'lucide-react'
import { projectsApi } from '../../api/projects'
import { useAuth } from '../../context/AuthContext'
import { formatDate, getStatusBadge, getErrorMessage, debounce } from '../../utils/helpers'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Pagination from '../../components/ui/Pagination'
import toast from 'react-hot-toast'
import ProjectForm from './ProjectForm'

export default function ProjectsPage() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()

  const [projects, setProjects]   = useState([])
  const [pagination, setPagination] = useState({ total: 0, last_page: 1, current_page: 1 })
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState('')
  const [page, setPage]           = useState(1)
  const [showForm, setShowForm]   = useState(false)
  const [editProject, setEditProject] = useState(null)
  const [confirm, setConfirm]     = useState(null)
  const [openMenu, setOpenMenu]   = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    projectsApi.list({ page, search, status: statusFilter })
      .then(r => {
        const d = r.data
        // Admin returns paginated: { data: [...], pagination: {...} }
        // User returns: { data: [...] }
        if (d.pagination) {
          setProjects(Array.isArray(d.data) ? d.data : [])
          setPagination(d.pagination)
        } else {
          const list = Array.isArray(d.data) ? d.data : []
          setProjects(list)
          setPagination({ total: list.length, last_page: 1, current_page: 1 })
        }
      })
      .catch(e => toast.error(getErrorMessage(e) || 'Failed to load projects'))
      .finally(() => setLoading(false))
  }, [page, search, statusFilter])

  useEffect(() => { load() }, [load])

  // Close dropdown when clicking outside
  useEffect(() => {
    const close = () => setOpenMenu(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  const debouncedSearch = useCallback(debounce(v => { setSearch(v); setPage(1) }, 400), [])

  const handleSaved = () => { setShowForm(false); setEditProject(null); load() }

  const handleArchive = async id => {
    try { await projectsApi.archive(id); toast.success('Project archived.'); load() }
    catch (e) { toast.error(getErrorMessage(e)) }
    finally { setConfirm(null) }
  }

  const handleDelete = async id => {
    try { await projectsApi.delete(id); toast.success('Project deleted.'); load() }
    catch (e) { toast.error(getErrorMessage(e)) }
    finally { setConfirm(null) }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isAdmin ? 'All Projects' : 'My Projects'}</h1>
          <p className="page-subtitle">{pagination.total} project{pagination.total !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => { setEditProject(null); setShowForm(true) }}>
            <Plus size={16} /> New Project
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
        <div className="search-bar" style={{ flex:1, minWidth:200 }}>
          <Search size={15} />
          <input placeholder="Search projects…" onChange={e => debouncedSearch(e.target.value)} />
        </div>
        {isAdmin && (
          <select className="form-control" style={{ width:140 }} value={statusFilter}
            onChange={e => { setStatus(e.target.value); setPage(1) }}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        )}
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <FolderOpen size={48} />
          <h3>No projects found</h3>
          <p>{isAdmin ? 'Create your first project to get started.' : 'You have not been granted access to any projects yet.'}</p>
          {isAdmin && (
            <button className="btn btn-primary" style={{ marginTop:12 }}
              onClick={() => setShowForm(true)}>
              <Plus size={16} /> Create Project
            </button>
          )}
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 }}>
          {projects.map(p => (
            <div key={p.id} className="card"
              style={{ cursor:'pointer', transition:'box-shadow .15s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow='var(--shadow-md)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow=''}>
              <div style={{ padding:'16px 20px' }}>
                {/* Header row */}
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                  <div style={{ display:'flex', gap:12, alignItems:'center', flex:1, minWidth:0 }}
                    onClick={() => navigate(`/projects/${p.id}`)}>
                    <div style={{ width:44, height:44, borderRadius:'var(--radius)',
                      background:'var(--color-primary-light)', display:'flex', alignItems:'center',
                      justifyContent:'center', flexShrink:0 }}>
                      <FolderOpen size={22} color="var(--color-primary)" />
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:'.95rem' }} className="truncate">{p.name}</div>
                      <div className="text-xs text-muted">{p.code}</div>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="dropdown" onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => setOpenMenu(openMenu === p.id ? null : p.id)}>
                        <MoreVertical size={16} />
                      </button>
                      {openMenu === p.id && (
                        <div className="dropdown-menu">
                          <button className="dropdown-item"
                            onClick={() => { setEditProject(p); setShowForm(true); setOpenMenu(null) }}>
                            <Edit size={14} /> Edit
                          </button>
                          <Link to={`/admin/permissions?project=${p.id}`} className="dropdown-item"
                            onClick={() => setOpenMenu(null)}>
                            <Users size={14} /> Manage Access
                          </Link>
                          <div className="dropdown-divider" />
                          <button className="dropdown-item"
                            onClick={() => { setConfirm({ type:'archive', id:p.id, name:p.name }); setOpenMenu(null) }}>
                            <Archive size={14} /> Archive
                          </button>
                          <button className="dropdown-item danger"
                            onClick={() => { setConfirm({ type:'delete', id:p.id, name:p.name }); setOpenMenu(null) }}>
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Body */}
                <div onClick={() => navigate(`/projects/${p.id}`)}>
                  {p.description && (
                    <p className="text-sm text-muted" style={{ marginTop:10 }}>
                      {p.description.slice(0, 90)}{p.description.length > 90 ? '…' : ''}
                    </p>
                  )}
                  <div style={{ display:'flex', gap:8, marginTop:12, flexWrap:'wrap' }}>
                    <span className={`badge ${getStatusBadge(p.status)}`}>{p.status}</span>
                    {p.category && <span className="badge badge-blue">{p.category}</span>}
                  </div>
                  <div style={{ display:'flex', gap:16, marginTop:12 }}>
                    <div className="text-xs text-muted">📄 {p.doc_count ?? 0} docs</div>
                    {isAdmin && <div className="text-xs text-muted">👥 {p.member_count ?? 0} members</div>}
                    {p.end_date && <div className="text-xs text-muted">📅 {formatDate(p.end_date)}</div>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={pagination.current_page} lastPage={pagination.last_page} onPageChange={setPage} />

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditProject(null) }}
        title={editProject ? 'Edit Project' : 'New Project'} size="lg">
        <ProjectForm project={editProject} onSaved={handleSaved}
          onCancel={() => { setShowForm(false); setEditProject(null) }} />
      </Modal>

      <ConfirmDialog
        open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={() => confirm?.type === 'delete' ? handleDelete(confirm.id) : handleArchive(confirm.id)}
        title={confirm?.type === 'delete' ? 'Delete Project' : 'Archive Project'}
        message={`Are you sure you want to ${confirm?.type} "${confirm?.name}"?${confirm?.type === 'delete' ? ' All documents will be permanently deleted.' : ''}`}
        danger={confirm?.type === 'delete'}
      />
    </div>
  )
}
