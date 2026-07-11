import { createContext, useContext, useState } from 'react'
import { authAdminLogin } from '../api/client'

// Admin auth — validated against the USERS table via POST /auth/admin/login
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('aq_admin_user')) } catch { return null }
  })

  const loginAdmin = async (username, password) => {
    const r = await authAdminLogin({ username, password })
    localStorage.setItem('aq_admin_user', JSON.stringify(r.data.user))
    localStorage.setItem('aq_admin_token', r.data.token)
    setUser(r.data.user)
    return r.data.user
  }

  const logout = () => {
    localStorage.removeItem('aq_admin_user')
    localStorage.removeItem('aq_admin_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loginAdmin, logout, userId: user?.id ?? 1 }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
