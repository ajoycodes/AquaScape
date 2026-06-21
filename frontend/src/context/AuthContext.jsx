import { createContext, useContext, useState } from 'react'

// Simple demo auth — no backend session, just localStorage
// Admin: username=admin, password=admin
// Stores: { id, name, role: 'admin' }

const AuthContext = createContext(null)

const ADMIN_CREDENTIALS = { username: 'admin', password: 'admin' }
const ADMIN_USER = { id: 1, name: 'Admin', role: 'admin' }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('aq_admin_user')) } catch { return null }
  })

  const loginAdmin = (username, password) => {
    if (
      username.toLowerCase() === ADMIN_CREDENTIALS.username &&
      password === ADMIN_CREDENTIALS.password
    ) {
      localStorage.setItem('aq_admin_user', JSON.stringify(ADMIN_USER))
      setUser(ADMIN_USER)
      return true
    }
    return false
  }

  const logout = () => {
    localStorage.removeItem('aq_admin_user')
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
