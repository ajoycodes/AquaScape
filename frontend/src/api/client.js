import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  timeout: 15000,
})

api.interceptors.response.use(
  res => res,
  err => {
    const msg = err.response?.data?.error || err.message || 'Request failed'
    console.error('[AquaScape API]', msg)
    return Promise.reject(new Error(msg))
  }
)

// ── Products ─────────────────────────────────────────────────────────────
export const getProducts    = (params = {}) => api.get('/products', { params })
export const getProduct     = id            => api.get(`/products/${id}`)
export const getProductType = type          => api.get(`/products/type/${type}`)
export const createProduct  = data          => api.post('/products', data)
export const updateProduct  = (id, data)    => api.put(`/products/${id}`, data)

// ── Inventory ─────────────────────────────────────────────────────────────
export const getInventory   = ()            => api.get('/inventory')
export const getLowStock    = ()            => api.get('/inventory/low-stock')
export const getAlerts      = ()            => api.get('/inventory/alerts')
export const resolveAlert   = (id, userId)  => api.put(`/inventory/alerts/${id}/resolve`, { user_id: userId })
export const adjustInventory= data          => api.post('/inventory/adjust', data)
export const getMovements   = (params = {}) => api.get('/inventory/movements', { params })

// ── Aquarium Builder ──────────────────────────────────────────────────────
export const getSetups      = (customerId)  => api.get('/builder/setups', { params: { customer_id: customerId } })
export const getTanks       = ()            => api.get('/builder/tanks')
export const getSetup       = id            => api.get(`/builder/setup/${id}`)
export const createSetup    = data          => api.post('/builder/setup', data)
export const addSetupItem   = (id, data)    => api.post(`/builder/setup/${id}/item`, data)
export const removeSetupItem= (id, pid)     => api.delete(`/builder/setup/${id}/item/${pid}`)
export const validateSetup  = id            => api.get(`/builder/setup/${id}/validate`)
export const getSetupPrice  = id            => api.get(`/builder/setup/${id}/price`)
export const saveSetup      = (id, data)    => api.post(`/builder/setup/${id}/save`, data)
export const getRules       = ()            => api.get('/builder/compatibility')
export const addRule        = data          => api.post('/builder/compatibility', data)

// ── Cart ──────────────────────────────────────────────────────────────────
export const getCart        = cid           => api.get(`/cart/${cid}`)
export const addToCart      = (cid, data)   => api.post(`/cart/${cid}/item`, data)
export const updateCartItem = (cid, pid, d) => api.put(`/cart/${cid}/item/${pid}`, d)
export const removeFromCart = (cid, pid)    => api.delete(`/cart/${cid}/item/${pid}`)
export const clearCart      = cid           => api.delete(`/cart/${cid}`)

// ── Orders ────────────────────────────────────────────────────────────────
export const getOrders      = (params = {}) => api.get('/orders', { params })
export const getOrder       = id            => api.get(`/orders/${id}`)
export const placeOrder     = data          => api.post('/orders/place', data)
export const updateStatus   = (id, data)    => api.put(`/orders/${id}/status`, data)
export const cancelOrder    = (id, data)    => api.post(`/orders/${id}/cancel`, data)
export const createReturn   = data          => api.post('/orders/returns', data)
export const processReturn  = (id, data)    => api.put(`/orders/returns/${id}`, data)

// ── Suppliers ─────────────────────────────────────────────────────────────
export const getSuppliers   = ()            => api.get('/suppliers')
export const getPOs         = (params = {}) => api.get('/suppliers/po', { params })
export const getPO          = id            => api.get(`/suppliers/po/${id}`)
export const createPO       = data          => api.post('/suppliers/po', data)
export const addPOItem      = (id, data)    => api.post(`/suppliers/po/${id}/item`, data)
export const submitPO       = (id, data)    => api.post(`/suppliers/po/${id}/submit`, data)
export const approvePO      = (id, data)    => api.post(`/suppliers/po/${id}/approve`, data)
export const receivePO      = (id, data)    => api.post(`/suppliers/po/${id}/receive`, data)

// ── Customers ─────────────────────────────────────────────────────────────
export const getCustomers   = (params = {}) => api.get('/customers', { params })
export const getCustomer    = id            => api.get(`/customers/${id}`)
export const createCustomer = data          => api.post('/customers', data)

// ── Reports ───────────────────────────────────────────────────────────────
export const getDashboard      = ()            => api.get('/reports/dashboard')
export const getMonthlySales   = (params = {}) => api.get('/reports/monthly-sales', { params })
export const getBestSellers    = (params = {}) => api.get('/reports/best-sellers', { params })
export const getProfitReport   = (params = {}) => api.get('/reports/profit', { params })
export const getFastMovers     = (params = {}) => api.get('/reports/fast-movers', { params })
export const getAuditLog       = (params = {}) => api.get('/reports/audit-log', { params })
export const getStockMovements = (params = {}) => api.get('/reports/stock-movements', { params })
export const getOracleObjects  = ()            => api.get('/reports/oracle-objects')

export default api
