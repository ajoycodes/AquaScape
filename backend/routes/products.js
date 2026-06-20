import { Router } from 'express'
import { query, execute, oracledb } from '../db.js'

const router = Router()

// GET /api/v1/products
router.get('/', async (req, res) => {
  try {
    const { type, category_id, search, limit = 100 } = req.query
    let sql = `SELECT p.product_id, p.product_name, p.product_type, p.sku,
                      p.unit_price, p.cost_price, p.description, p.image_url,
                      c.category_name,
                      NVL(i.qty_on_hand, 0)   AS qty_on_hand,
                      NVL(i.qty_reserved, 0)  AS qty_reserved,
                      (NVL(i.qty_on_hand,0) - NVL(i.qty_reserved,0)) AS qty_available
               FROM products p
               JOIN categories c ON p.category_id = c.category_id
               LEFT JOIN inventory i ON i.product_id = p.product_id
               WHERE p.is_active = 1`
    const binds = {}

    if (type) { sql += ' AND p.product_type = :type'; binds.type = type.toUpperCase() }
    if (category_id) { sql += ' AND p.category_id = :cat'; binds.cat = Number(category_id) }
    if (search) { sql += ' AND UPPER(p.product_name) LIKE UPPER(:search)'; binds.search = `%${search}%` }

    sql = `SELECT * FROM (${sql} ORDER BY p.product_name) WHERE ROWNUM <= :lim`
    binds.lim = Number(limit)

    const rows = await query(sql, binds)
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/v1/products/type/:type
router.get('/type/:type', async (req, res) => {
  try {
    const validTypes = ['FISH', 'PLANT', 'TANK', 'EQUIPMENT', 'DECORATION']
    const t = req.params.type.toUpperCase()
    if (!validTypes.includes(t)) return res.status(400).json({ error: 'Invalid product type' })

    const rows = await query(
      `SELECT p.product_id, p.product_name, p.unit_price, p.image_url,
              p.description, p.product_type,
              NVL(i.qty_on_hand,0) AS qty_on_hand,
              tk.tank_id
       FROM products p
       LEFT JOIN inventory i ON i.product_id = p.product_id
       LEFT JOIN tanks tk ON tk.product_id = p.product_id
       WHERE p.product_type = :type AND p.is_active = 1
       ORDER BY p.product_name`,
      { type: t }
    )
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/v1/products/:id
router.get('/:id', async (req, res) => {
  try {
    const rows = await query(
      `SELECT p.*, c.category_name, NVL(i.qty_on_hand,0) AS qty_on_hand
       FROM products p
       JOIN categories c ON p.category_id = c.category_id
       LEFT JOIN inventory i ON i.product_id = p.product_id
       WHERE p.product_id = :id`,
      { id: Number(req.params.id) }
    )
    if (!rows.length) return res.status(404).json({ error: 'Product not found' })
    res.json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/v1/products
router.post('/', async (req, res) => {
  try {
    const { category_id, product_name, product_type, sku, unit_price, cost_price, description } = req.body
    if (!category_id || !product_name || !product_type || unit_price == null)
      return res.status(400).json({ error: 'category_id, product_name, product_type, unit_price required' })

    await execute(
      `INSERT INTO products (category_id,product_name,product_type,sku,unit_price,cost_price,description)
       VALUES (:cid,:name,:type,:sku,:price,:cost,:desc)`,
      { cid: Number(category_id), name: product_name, type: product_type.toUpperCase(),
        sku: sku || null, price: Number(unit_price), cost: cost_price ? Number(cost_price) : null,
        desc: description || null }
    )
    const newRow = await query(`SELECT product_id FROM products WHERE product_name = :name AND ROWNUM = 1 ORDER BY product_id DESC`, { name: product_name })
    res.status(201).json({ product_id: newRow[0]?.PRODUCT_ID, message: 'Product created' })
  } catch (e) { res.status(422).json({ error: e.message }) }
})

// PUT /api/v1/products/:id
router.put('/:id', async (req, res) => {
  try {
    const { product_name, unit_price, cost_price, description, is_active } = req.body
    await execute(
      `UPDATE products SET
          product_name = NVL(:name, product_name),
          unit_price   = NVL(:price, unit_price),
          cost_price   = NVL(:cost, cost_price),
          description  = NVL(:desc, description),
          is_active    = NVL(:active, is_active)
       WHERE product_id = :id`,
      { name: product_name || null, price: unit_price != null ? Number(unit_price) : null,
        cost: cost_price != null ? Number(cost_price) : null, desc: description || null,
        active: is_active != null ? (is_active ? 1 : 0) : null, id: Number(req.params.id) }
    )
    res.json({ message: 'Product updated' })
  } catch (e) { res.status(422).json({ error: e.message }) }
})

// DELETE /api/v1/products/:id  (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    await execute(`UPDATE products SET is_active = 0 WHERE product_id = :id`, { id: Number(req.params.id) })
    res.json({ message: 'Product deactivated' })
  } catch (e) { res.status(422).json({ error: e.message }) }
})

export default router
