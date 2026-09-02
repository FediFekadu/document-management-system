import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount — restore session if token exists in localStorage
  useEffect(() => {
    const token = localStorage.getItem('dms_token')
    if (!token) {
      setLoading(false)
      return
    }
    authApi.me()
      .then(r => setUser(r.data.data))
      .catch(() => {
        // Token is invalid/expired — clear it
        localStorage.removeItem('dms_token')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (identifier, password) => {
    const res  = await authApi.login({ identifier, password })
    const data = res.data.data
    // Save token to localStorage so it persists across page reloads
    localStorage.setItem('dms_token', data.token)
    // Remove token from user object before storing in state
    const { token, ...userWithoutToken } = data
    setUser(userWithoutToken)
    return userWithoutToken
  }, [])

  const logout = useCallback(async () => {
    try { await authApi.logout() } catch (_) {}
    localStorage.removeItem('dms_token')
    setUser(null)
    window.location.href = '/login'
  }, [])

  const refreshUser = useCallback(async () => {
    const res = await authApi.me()
    setUser(res.data.data)
  }, [])

  const isAdmin = user?.role === 'admin'

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
