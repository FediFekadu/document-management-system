import api from './client'

export const projectsApi = {
  list:           (params)         => api.get('/projects', { params }),
  get:            (id)             => api.get(`/projects/${id}`),
  create:         (data)           => api.post('/projects', data),
  update:         (id, d)          => api.put(`/projects/${id}`, d),
  archive:        (id)             => api.post(`/projects/${id}/archive`),
  restore:        (id)             => api.post(`/projects/${id}/restore`),
  delete:         (id)             => api.delete(`/projects/${id}`),
  stats:          ()               => api.get('/projects/stats'),

  // Members
  getMembers:     (pid)            => api.get(`/projects/${pid}/members`),
  addMember:      (pid, data)      => api.post(`/projects/${pid}/members`, data),
  updateMember:   (pid, uid, data) => api.patch(`/projects/${pid}/members/${uid}`, data),
  removeMember:   (pid, uid)       => api.delete(`/projects/${pid}/members/${uid}`),

  // Folders
  getFolders:     (pid)            => api.get(`/projects/${pid}/folders`),
  createFolder:   (pid, data)      => api.post(`/projects/${pid}/folders`, data),
  updateFolder:   (pid, fid, data) => api.patch(`/projects/${pid}/folders/${fid}`, data),
  deleteFolder:   (pid, fid)       => api.delete(`/projects/${pid}/folders/${fid}`),
}
