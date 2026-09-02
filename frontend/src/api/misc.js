import api from './client'

export const dashboardApi = {
  stats: () => api.get('/dashboard'),
}

export const notificationsApi = {
  list:        (params) => api.get('/notifications', { params }),
  unreadCount: ()       => api.get('/notifications/unread-count'),
  markRead:    (id)     => api.patch(`/notifications/${id}`),
  markAllRead: ()       => api.post('/notifications/mark-all-read'),
  delete:      (id)     => api.delete(`/notifications/${id}`),
}

export const favoritesApi = {
  list:   ()    => api.get('/favorites'),
  toggle: (did) => api.post(`/favorites/${did}`),
}

export const activityApi = {
  list: (params) => api.get('/activity', { params }),
}

export const tagsApi = {
  list: () => api.get('/tags'),
}
