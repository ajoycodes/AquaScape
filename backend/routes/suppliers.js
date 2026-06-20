import { Router } from 'express'
import { query, execute, callProc, oracledb } from '../db.js'

const router = Router()

// GET /api/v1/suppliers
router.get('/', async (_req, res) => {
  try {
    res.json(await query('SELECT * FROM suppliers WHERE is_active = 1 ORDER BY supplier_name'))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/v1/suppliers/:id  — must come AFTER /po routes
router.get('/:id(\\d+)', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM suppliers WHERE supplier_id = :id', { id: Number(req.params.id) })
    if (!rows.length) return res.status(404).json({ error: 'Not found' })
    res.json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/v1/suppliers
router.post('/', async (req, res) => {
  try {
    const { supplier_name, contact_name, email, phone, address, country, payment_terms } = req.body
    if (!supplier_name) return res.status(400).json({ error: 'supplier_name required' })
    await execute(
      `INSERT INTO suppliers (supplier_name,contact_name,email,phone,address,country,payment_terms)
       VALUES (:name,:contact,:email,:phone,:addr,:country,:terms)`,
      { name: supplier_name, contact: contact_name || null, email: email || null,
        phone: phone || null, addr: address || null, country: country || null,
        terms: payment_terms || null }
    )
    res.status(201).json({ message: 'Supplier created' })
  } catch (e) { res.status(422).json({ error: e.message }) }
})

// PUT /api/v1/suppliers/:id
router.put('/:id(\\d+)', async (req, res) => {
  try {
    const { supplier_name, contact_name, email, phone, is_active } = req.body
    await execute(
      `UPDATE suppliers SET
          supplier_name = NVL(:name,    supplier_name),
          contact_name  = NVL(:contact, contact_name),
          email         = NVL(:email,   email),
          phone         = NVL(:phone,   phone),
          is_active     = NVL(:active,  is_active)
       WHERE supplier_id = :id`,
      { name: supplier_name || null, contact: contact_name || null, email: email || null,
        phone: phone || null, active: is_active != null ? (is_active ? 1 : 0) : null,
        id: Number(req.params.id) }
    )
    res.json({ message: 'Supplier updated' })
  } catch (e) { res.status(422).json({ error: e.message }) }
})

// ── Purchase Orders ─────────────────────────────────────────────────────────

// GET /api/v1/suppliers/po
router.get('/po', async (req, res) => {
  try {
    const { status } = req.query
    let sql = `SELECT spo.po_id, spo.po_date, spo.po_status AS status, spo.po_status,
                      spo.total_amount, spo.expected_date, spo.received_date, spo.notes,
                      s.supplier_name
               FROM supplier_po spo
               JOIN suppliers s ON spo.supplier_id = s.supplier_id`
    const binds = {}
    if (status) { sql += ' WHERE spo.po_status = :status'; binds.status = status.toUpperCase() }
    sql += ' ORDER BY spo.po_date DESC'
    res.json(await query(sql, binds))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/v1/suppliers/po/:id
router.get('/po/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const po = await query(
      `SELECT spo.*, spo.po_status AS status, s.supplier_name
       FROM supplier_po spo
       JOIN suppliers s ON spo.supplier_id = s.supplier_id
       WHERE spo.po_id = :id`,
      { id }
    )
    if (!po.length) return res.status(404).json({ error: 'PO not found' })
    const items = await query(
      `SELECT spoi.*, p.product_name,
              (spoi.quantity_ordered * spoi.unit_cost) AS line_total
       FROM supplier_po_items spoi
       JOIN products p ON spoi.product_id = p.product_id
       WHERE spoi.po_id = :id`,
      { id }
    )
    // Flatten: spread po fields + items array so detail.PO_ID, detail.STATUS etc. work directly
    res.json({ ...po[0], items })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/v1/suppliers/po
// Accepts created_by OR user_id (frontend sends created_by: 1)
router.post('/po', async (req, res) => {
  try {
    const { supplier_id, user_id, created_by, expected_date, notes } = req.body
    const uid = user_id || created_by || 1
    if (!supplier_id) return res.status(400).json({ error: 'supplier_id required' })
    const out = await callProc(
      `BEGIN create_supplier_po(:sid,:uid,TO_DATE(:edate,'YYYY-MM-DD'),:notes,:poid); END;`,
      {
        sid:   Number(supplier_id),
        uid:   Number(uid),
        edate: expected_date || null,
        notes: notes || null,
        poid:  { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      }
    )
    res.status(201).json({ po_id: out.poid, message: 'PO created' })
  } catch (e) { res.status(422).json({ error: e.message }) }
})

// POST /api/v1/suppliers/po/:id/item
router.post('/po/:id/item', async (req, res) => {
  try {
    const { product_id, quantity, unit_cost } = req.body
    if (!product_id || !quantity || !unit_cost)
      return res.status(400).json({ error: 'product_id, quantity, unit_cost required' })
    await callProc(
      `BEGIN add_po_item(:poid,:pid,:qty,:cost); END;`,
      { poid: Number(req.params.id), pid: Number(product_id), qty: Number(quantity), cost: Number(unit_cost) }
    )
    res.json({ message: 'PO item added' })
  } catch (e) { res.status(422).json({ error: e.message }) }
})

// POST /api/v1/suppliers/po/:id/submit
router.post('/po/:id/submit', async (req, res) => {
  try {
    const { user_id = 1 } = req.body
    await callProc(`BEGIN submit_supplier_po(:poid,:uid); END;`,
      { poid: Number(req.params.id), uid: Number(user_id) })
    res.json({ message: 'PO submitted' })
  } catch (e) { res.status(422).json({ error: e.message }) }
})

// POST /api/v1/suppliers/po/:id/approve
router.post('/po/:id/approve', async (req, res) => {
  try {
    const { user_id = 1 } = req.body
    await callProc(`BEGIN approve_supplier_po(:poid,:uid); END;`,
      { poid: Number(req.params.id), uid: Number(user_id) })
    res.json({ message: 'PO approved' })
  } catch (e) { res.status(422).json({ error: e.message }) }
})

// POST /api/v1/suppliers/po/:id/receive
router.post('/po/:id/receive', async (req, res) => {
  try {
    const { user_id = 1 } = req.body
    await callProc(`BEGIN receive_supplier_po(:poid,:uid); END;`,
      { poid: Number(req.params.id), uid: Number(user_id) })
    res.json({ message: 'PO received — stock updated' })
  } catch (e) { res.status(422).json({ error: e.message }) }
})

export default router
