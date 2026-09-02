import api from './client'

export const authApi = {
  login:          (data)   => api.post('/auth/login', data),
  logout:         ()       => api.post('/auth/logout'),
  me:             ()       => api.get('/auth/me'),
  changePassword: (data)   => api.post('/auth/change-password', data),
}
