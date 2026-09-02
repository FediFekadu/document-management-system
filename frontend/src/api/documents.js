import api from './client'

export const documentsApi = {
  list:          (pid, params)    => api.get(`/projects/${pid}/documents`, { params }),
  get:           (pid, did)       => api.get(`/projects/${pid}/documents/${did}`),
  upload:        (pid, formData)  => api.post(`/projects/${pid}/documents`, formData, {
                                       headers: { 'Content-Type': 'multipart/form-data' }
                                     }),
  update:        (pid, did, data) => api.patch(`/projects/${pid}/documents/${did}`, data),
  archive:       (pid, did)       => api.post(`/projects/${pid}/documents/${did}/archive`),
  restore:       (pid, did)       => api.post(`/projects/${pid}/documents/${did}/restore`),
  delete:        (pid, did)       => api.delete(`/projects/${pid}/documents/${did}`),
  getArchived:   (pid)            => api.get(`/projects/${pid}/documents/archived`),

  // Versions
  getVersions:   (pid, did)       => api.get(`/projects/${pid}/documents/${did}/versions`),
  uploadVersion: (pid, did, fd)   => api.post(`/projects/${pid}/documents/${did}/versions`, fd, {
                                       headers: { 'Content-Type': 'multipart/form-data' }
                                     }),

  // Download — uses axios so the X-Auth-Token header is sent,
  // then triggers a browser save-as dialog from the blob response
  download: async (pid, did, fileName) => {
    const response = await api.get(
      `/projects/${pid}/documents/${did}/download`,
      { responseType: 'blob' }
    )
    const url  = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href  = url
    link.setAttribute('download', fileName || 'document')
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },

  downloadVersion: async (pid, did, vid, fileName) => {
    const response = await api.get(
      `/projects/${pid}/documents/${did}/versions/${vid}/download`,
      { responseType: 'blob' }
    )
    const url  = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href  = url
    link.setAttribute('download', fileName || 'document')
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },

  // Stats & search
  stats:  ()       => api.get('/documents/stats'),
  search: (params) => api.get('/search', { params }),
}
