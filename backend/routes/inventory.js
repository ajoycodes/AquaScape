import { Router } from 'express'
import { query, execute, callProc, oracledb } from '../db.js'

const router = Router()

// GET /api/v1/inventory
router.get('/', async (_req, res) => {
  try {
    const rows = await query('SELECT * FROM vw_inventory_summary ORDER BY product_name')
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/v1/inventory/low-stock
router.get('/low-stock', async (_req, res) => {
  try {
    const rows = await query('SELECT * FROM vw_low_stock ORDER BY qty_on_hand')
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/v1/inventory/alerts
// Alias qty_at_alert → qty_on_hand to match Inventory.jsx: a.QTY_ON_HAND
router.get('/alerts', async (_req, res) => {
  try {
    const rows = await query(
      `SELECT la.alert_id, la.product_id, p.product_name,
              la.qty_at_alert AS qty_on_hand,
              la.qty_at_alert, la.reorder_level, la.alert_date, la.is_resolved
       FROM low_stock_alerts la
       JOIN products p ON la.product_id = p.product_id
       WHERE la.is_resolved = 0
       ORDER BY la.alert_date DESC`
    )
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// PUT /api/v1/inventory/alerts/:id/resolve
router.put('/alerts/:id/resolve', async (req, res) => {
  try {
    const { user_id } = req.body
    await execute(
      `UPDATE low_stock_alerts
       SET is_resolved = 1, resolved_at = SYSDATE, resolved_by = :uid
       WHERE alert_id = :id`,
      { uid: Number(user_id), id: Number(req.params.id) }
    )
    res.json({ message: 'Alert resolved' })
  } catch (e) { res.status(422).json({ error: e.message }) }
})

// POST /api/v1/inventory/adjust
router.post('/adjust', async (req, res) => {
  try {
    const { product_id, delta, move_type, user_id, notes } = req.body
    if (!product_id || delta == null || !move_type || !user_id)
      return res.status(400).json({ error: 'product_id, delta, move_type, user_id required' })

    await callProc(
      `BEGIN update_inventory(:pid,:delta,:mtype,NULL,'ADJUSTMENT',:uid,:notes); END;`,
      { pid: Number(product_id), delta: Number(delta), mtype: move_type,
        uid: Number(user_id), notes: notes || null }
    )
    res.json({ message: 'Inventory adjusted' })
  } catch (e) { res.status(422).json({ error: e.message }) }
})

// GET /api/v1/inventory/movements
// Sort by MOVED_AT (view column name). product_id filter joins via product_name.
router.get('/movements', async (req, res) => {
  try {
    const { product_id, limit = 100 } = req.query
    let sql
    const binds = {}
    if (product_id) {
      sql = `SELECT m.* FROM vw_stock_movement_log m
             JOIN products p ON p.product_name = m.product_name
             WHERE p.product_id = :pid`
      binds.pid = Number(product_id)
    } else {
      sql = 'SELECT * FROM vw_stock_movement_log'
    }
    sql = `SELECT * FROM (${sql} ORDER BY MOVED_AT DESC) WHERE ROWNUM <= :lim`
    binds.lim = Number(limit)
    res.json(await query(sql, binds))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
