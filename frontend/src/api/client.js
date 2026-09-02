import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost/dms/backend/api',
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
})

// Attach token on every request using X-Auth-Token header
// (Apache/XAMPP strips the Authorization header during URL rewrites,
//  but never strips custom X-* headers)
api.interceptors.request.use(config => {
  const token = localStorage.getItem('dms_token')
  if (token) {
    config.headers['X-Auth-Token'] = token
  }
  return config
})

// Redirect to login on 401, except during startup session check
api.interceptors.response.use(
  res => res,
  err => {
    const url     = err.config?.url || ''
    const is401   = err.response?.status === 401
    const isMe    = url.includes('/auth/me')
    const isLogin = url.includes('/auth/login')

    if (is401 && !isMe && !isLogin) {
      localStorage.removeItem('dms_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
