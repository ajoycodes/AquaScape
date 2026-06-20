import { Router } from 'express'
import { query, execute, callProc, oracledb } from '../db.js'

const router = Router()

// GET /api/v1/orders
router.get('/', async (req, res) => {
  try {
    const { status, customer_id, limit = 50 } = req.query
    let sql = `SELECT o.order_id, o.order_date, o.order_status AS status,
                      o.order_status,
                      c.first_name || ' ' || c.last_name AS customer_name,
                      o.subtotal, o.discount_total, o.tax_amount, o.total_amount,
                      o.shipping_addr
               FROM orders o
               JOIN customers c ON o.customer_id = c.customer_id
               WHERE 1=1`
    const binds = {}
    if (status) { sql += ' AND o.order_status = :status'; binds.status = status.toUpperCase() }
    if (customer_id) { sql += ' AND o.customer_id = :cid'; binds.cid = Number(customer_id) }
    sql = `SELECT * FROM (${sql} ORDER BY o.order_date DESC) WHERE ROWNUM <= :lim`
    binds.lim = Number(limit)
    res.json(await query(sql, binds))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/v1/orders/:id
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const order = await query(
      `SELECT o.*, o.order_status AS status, o.order_date AS created_at,
              c.first_name || ' ' || c.last_name AS customer_name
       FROM orders o JOIN customers c ON o.customer_id = c.customer_id
       WHERE o.order_id = :oid`,
      { oid: id }
    )
    if (!order.length) return res.status(404).json({ error: 'Order not found' })

    const [items, payments] = await Promise.all([
      query(`SELECT oi.*, p.product_name, p.product_type
             FROM order_items oi JOIN products p ON oi.product_id = p.product_id
             WHERE oi.order_id = :oid`, { oid: id }),
      query(`SELECT * FROM payments WHERE order_id = :oid ORDER BY payment_date DESC`, { oid: id }),
    ])
    // Flatten: spread order fields + items + payments so detail.ORDER_ID, detail.STATUS etc. work
    res.json({ ...order[0], items, payments })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/v1/orders/place
router.post('/place', async (req, res) => {
  try {
    const { customer_id, shipping_addr, setup_id, discount_code } = req.body
    if (!customer_id || !shipping_addr)
      return res.status(400).json({ error: 'customer_id and shipping_addr required' })

    const out = await callProc(
      `BEGIN place_order(:cid,:sid,:code,:addr,:oid); END;`,
      {
        cid:  Number(customer_id),
        sid:  setup_id ? Number(setup_id) : null,
        code: discount_code || null,
        addr: shipping_addr,
        oid:  { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      }
    )
    res.status(201).json({ order_id: out.oid, status: 'CONFIRMED' })
  } catch (e) { res.status(422).json({ error: e.message }) }
})

// PUT /api/v1/orders/:id/status
// user_id defaults to 1 for demo — frontend doesn't send it
router.put('/:id/status', async (req, res) => {
  try {
    const { status, user_id = 1 } = req.body
    if (!status) return res.status(400).json({ error: 'status required' })
    await callProc(
      `BEGIN update_order_status(:oid,:status,:uid); END;`,
      { oid: Number(req.params.id), status: status.toUpperCase(), uid: Number(user_id) }
    )
    res.json({ message: `Status updated to ${status.toUpperCase()}` })
  } catch (e) { res.status(422).json({ error: e.message }) }
})

// POST /api/v1/orders/:id/cancel
router.post('/:id/cancel', async (req, res) => {
  try {
    const { user_id = 1, reason } = req.body
    await callProc(
      `BEGIN cancel_order(:oid,:uid,:reason); END;`,
      { oid: Number(req.params.id), uid: Number(user_id), reason: reason || null }
    )
    res.json({ message: `Order ${req.params.id} cancelled` })
  } catch (e) { res.status(422).json({ error: e.message }) }
})

// POST /api/v1/orders/returns
router.post('/returns', async (req, res) => {
  try {
    const { order_id, customer_id, reason, refund_amount, items } = req.body
    if (!order_id || !customer_id || !items?.length)
      return res.status(400).json({ error: 'order_id, customer_id, items required' })

    const out = await callProc(
      `INSERT INTO returns (order_id, customer_id, reason, refund_amount)
       VALUES (:oid, :cid, :reason, :refund)
       RETURNING return_id INTO :rid`,
      {
        oid:    Number(order_id),
        cid:    Number(customer_id),
        reason: reason || null,
        refund: refund_amount ? Number(refund_amount) : 0,
        rid:    { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      }
    )
    const returnId = out.rid

    for (const item of items) {
      await execute(
        `INSERT INTO return_items (return_id, order_item_id, quantity, condition_code)
         VALUES (:rid, :oiid, :qty, :cond)`,
        { rid: returnId, oiid: Number(item.order_item_id), qty: Number(item.quantity), cond: item.condition }
      )
    }
    res.status(201).json({ return_id: returnId, message: 'Return request created' })
  } catch (e) { res.status(422).json({ error: e.message }) }
})

// PUT /api/v1/orders/returns/:id
router.put('/returns/:id', async (req, res) => {
  try {
    const { user_id = 1, approve } = req.body
    await callProc(
      `BEGIN process_return(:rid,:uid,:approve,NULL); END;`,
      { rid: Number(req.params.id), uid: Number(user_id), approve: approve ? 1 : 0 }
    )
    res.json({ message: approve ? 'Return approved and refunded' : 'Return rejected' })
  } catch (e) { res.status(422).json({ error: e.message }) }
})

export default router
