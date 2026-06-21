import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getCart } from '../api/client'

const ShopContext = createContext(null)

export function ShopProvider({ children }) {
  const [customer, setCustomerState] = useState(() => {
    try { return JSON.parse(localStorage.getItem('aq_customer')) } catch { return null }
  })
  const [cartCount, setCartCount] = useState(0)

  const setCustomer = (c) => {
    setCustomerState(c)
    if (c) localStorage.setItem('aq_customer', JSON.stringify(c))
    else    localStorage.removeItem('aq_customer')
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
    <ShopContext.Provider value={{ customer, setCustomer, cartCount, refreshCart }}>
      {children}
    </ShopContext.Provider>
  )
}

export function useShop() {
  return useContext(ShopContext)
}
