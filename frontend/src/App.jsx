import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider }  from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ShopProvider }  from './context/ShopContext'
import AdminLayout from './layouts/AdminLayout'
import ShopLayout  from './layouts/ShopLayout'

import Login           from './pages/Login'
import Dashboard       from './pages/Dashboard'
import ProductCatalog  from './pages/ProductCatalog'
import AquariumBuilder from './pages/AquariumBuilder'
import Cart            from './pages/Cart'
import Orders          from './pages/Orders'
import Inventory       from './pages/Inventory'
import Suppliers       from './pages/Suppliers'
import Reports         from './pages/Reports'
import AuditLog        from './pages/AuditLog'
import Customers       from './pages/Customers'

import ShopHome    from './pages/shop/ShopHome'
import ShopBrowse  from './pages/shop/ShopBrowse'
import ShopCart    from './pages/shop/ShopCart'
import ShopOrders  from './pages/shop/ShopOrders'
import ShopBuilder from './pages/shop/ShopBuilder'
import ShopProduct from './pages/shop/ShopProduct'

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ShopProvider>
          <Routes>
            {/* Auth */}
            <Route path="/login" element={<Login />} />

            {/* Admin panel — protected by AdminLayout which checks auth */}
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard"        element={<Dashboard />} />
              <Route path="/products"         element={<ProductCatalog />} />
              <Route path="/builder"          element={<AquariumBuilder />} />
              <Route path="/cart/:customerId" element={<Cart />} />
              <Route path="/orders"           element={<Orders />} />
              <Route path="/inventory"        element={<Inventory />} />
              <Route path="/suppliers"        element={<Suppliers />} />
              <Route path="/customers"        element={<Customers />} />
              <Route path="/reports"          element={<Reports />} />
              <Route path="/audit"            element={<AuditLog />} />
            </Route>

            {/* Customer storefront */}
            <Route path="/shop" element={<ShopLayout />}>
              <Route index  element={<ShopHome />} />
              <Route path="browse"  element={<ShopBrowse />} />
              <Route path="cart"    element={<ShopCart />} />
              <Route path="orders"  element={<ShopOrders />} />
              <Route path="builder"       element={<ShopBuilder />} />
              <Route path="product/:id"  element={<ShopProduct />} />
            </Route>
          </Routes>
        </ShopProvider>
      </ToastProvider>
    </AuthProvider>
  )
}
