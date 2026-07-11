import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getCart, authLogin, authRegister } from '../api/client'

const ShopContext = createContext(null)

export function ShopProvider({ children }) {
  const [customer, setCustomer] = useState(() => {
    try { return JSON.parse(localStorage.getItem('aq_customer')) } catch { return null }
  })
  const [cartCount, setCartCount] = useState(0)

  const persist = (cust, token) => {
    setCustomer(cust)
    if (cust) {
      localStorage.setItem('aq_customer', JSON.stringify(cust))
      localStorage.setItem('aq_token', token)
    } else {
      localStorage.removeItem('aq_customer')
      localStorage.removeItem('aq_token')
    }
  }

  const login = async (email, password) => {
    const r = await authLogin({ email, password })
    persist(r.data.customer, r.data.token)
    return r.data.customer
  }

  const register = async (form) => {
    const r = await authRegister(form)
    persist(r.data.customer, r.data.token)
    return r.data.customer
  }

  const logout = () => {
    persist(null, null)
    setCartCount(0)
  }

  const refreshCart = useCallback(async () => {
    if (!customer) { setCartCount(0); return }
    try {
      const r = await getCart(customer.id)
      setCartCount((r.data.items ?? []).reduce((s, i) => s + i.QUANTITY, 0))
    } catch { setCartCount(0) }
  }, [customer])

  useEffect(() => { refreshCart() }, [refreshCart])

  return (
    <ShopContext.Provider value={{ customer, login, register, logout, cartCount, refreshCart }}>
      {children}
    </ShopContext.Provider>
  )
}

export function useShop() {
  return useContext(ShopContext)
}
