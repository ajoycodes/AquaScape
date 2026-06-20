import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { initPool } from './db.js'

import productsRouter   from './routes/products.js'
import inventoryRouter  from './routes/inventory.js'
import ordersRouter     from './routes/orders.js'
import customersRouter  from './routes/customers.js'
import suppliersRouter  from './routes/suppliers.js'
import builderRouter    from './routes/builder.js'
import cartRouter       from './routes/cart.js'
import reportsRouter    from './routes/reports.js'

const app  = express()
const BASE = '/api/v1'

app.use(cors())
app.use(express.json())

app.get(`${BASE}/ping`, (_req, res) => res.json({ ok: true, ts: new Date() }))

app.use(`${BASE}/products`,  productsRouter)
app.use(`${BASE}/inventory`, inventoryRouter)
app.use(`${BASE}/orders`,    ordersRouter)
app.use(`${BASE}/customers`, customersRouter)
app.use(`${BASE}/suppliers`, suppliersRouter)
app.use(`${BASE}/builder`,   builderRouter)
app.use(`${BASE}/cart`,      cartRouter)
app.use(`${BASE}/reports`,   reportsRouter)

app.use((_req, res) => res.status(404).json({ error: 'Not found' }))
app.use((err, _req, res, _next) => {
  console.error('[server]', err)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

const PORT = process.env.PORT || 8000

initPool()
  .then(() => app.listen(PORT, () => console.log(`AquaScape API → http://localhost:${PORT}`)))
  .catch(err => { console.error('[startup] Failed to connect to Oracle:', err.message); process.exit(1) })
