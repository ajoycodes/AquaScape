import { Router } from 'express'
import { query, execute } from '../db.js'

const router = Router()

// GET /api/v1/customers
router.get('/', async (req, res) => {
  try {
    const { search } = req.query
    let sql = `SELECT c.customer_id, c.first_name, c.last_name, c.email, c.phone,
                      c.address, c.city, c.country, c.created_at,
                      COUNT(o.order_id) AS order_count,
                      NVL(SUM(o.total_amount), 0) AS lifetime_value
               FROM customers c
               LEFT JOIN orders o ON c.customer_id = o.customer_id
                   AND o.order_status NOT IN ('CANCELLED','REFUNDED')
               WHERE c.is_active = 1`
    const binds = {}
    if (search) {
      sql += ` AND (UPPER(c.first_name || ' ' || c.last_name) LIKE UPPER(:s)
                    OR UPPER(c.email) LIKE UPPER(:s2))`
      binds.s  = `%${search}%`
      binds.s2 = `%${search}%`
    }
    sql += ` GROUP BY c.customer_id, c.first_name, c.last_name, c.email,
                      c.phone, c.address, c.city, c.country, c.created_at
             ORDER BY lifetime_value DESC`
    res.json(await query(sql, binds))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/v1/customers/:id
router.get('/:id', async (req, res) => {
  try {
    const rows = await query(
      'SELECT * FROM customers WHERE customer_id = :id',
      { id: Number(req.params.id) }
    )
    if (!rows.length) return res.status(404).json({ error: 'Customer not found' })
    const orders = await query(
      `SELECT order_id, order_date, order_status, total_amount
       FROM orders WHERE customer_id = :id ORDER BY order_date DESC`,
      { id: Number(req.params.id) }
    )
    res.json({ customer: rows[0], orders })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/v1/customers
router.post('/', async (req, res) => {
  try {
    const { first_name, last_name, email, phone, address, city, country } = req.body
    if (!first_name || !last_name || !email)
      return res.status(400).json({ error: 'first_name, last_name, email required' })

    await execute(
      `INSERT INTO customers (first_name,last_name,email,phone,address,city,country)
       VALUES (:fn,:ln,:email,:phone,:addr,:city,:country)`,
      { fn: first_name, ln: last_name, email, phone: phone || null,
        addr: address || null, city: city || null, country: country || 'Malaysia' }
    )
    // Create empty cart for new customer
    await execute(
      `INSERT INTO cart (customer_id)
       SELECT customer_id FROM customers WHERE email = :email AND ROWNUM = 1`,
      { email }
    )
    res.status(201).json({ message: 'Customer created' })
  } catch (e) { res.status(422).json({ error: e.message }) }
})

// PUT /api/v1/customers/:id
router.put('/:id', async (req, res) => {
  try {
    const { first_name, last_name, phone, address, city } = req.body
    await execute(
      `UPDATE customers SET
          first_name = NVL(:fn,  first_name),
          last_name  = NVL(:ln,  last_name),
          phone      = NVL(:ph,  phone),
          address    = NVL(:addr,address),
          city       = NVL(:city,city)
       WHERE customer_id = :id`,
      { fn: first_name || null, ln: last_name || null, ph: phone || null,
        addr: address || null, city: city || null, id: Number(req.params.id) }
    )
    res.json({ message: 'Customer updated' })
  } catch (e) { res.status(422).json({ error: e.message }) }
})

export default router
