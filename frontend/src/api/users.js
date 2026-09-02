import api from './client'

export const usersApi = {
  list:          (params) => api.get('/users', { params }),
  get:           (id)     => api.get(`/users/${id}`),
  create:        (data)   => api.post('/users', data),
  update:        (id, d)  => api.put(`/users/${id}`, d),
  delete:        (id)     => api.delete(`/users/${id}`),
  updateProfile: (data)   => api.put('/users/profile', data),
}
