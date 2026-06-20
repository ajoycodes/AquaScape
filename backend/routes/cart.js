import { Router } from 'express'
import { query, execute } from '../db.js'

const router = Router()

// GET /api/v1/cart/:customerId
router.get('/:cid', async (req, res) => {
  try {
    const cid = Number(req.params.cid)
    const items = await query(
      `SELECT ci.cart_item_id, ci.product_id, ci.quantity,
              p.product_name, p.product_type, p.unit_price, p.image_url,
              (ci.quantity * p.unit_price) AS line_total,
              NVL(i.qty_on_hand,0) AS stock_available
       FROM cart_items ci
       JOIN cart     c  ON ci.cart_id    = c.cart_id
       JOIN products p  ON ci.product_id = p.product_id
       LEFT JOIN inventory i ON i.product_id = p.product_id
       WHERE c.customer_id = :cid
       ORDER BY p.product_name`,
      { cid }
    )
    const subtotal = items.reduce((sum, r) => sum + Number(r.LINE_TOTAL ?? 0), 0)
    res.json({ items, subtotal: Math.round(subtotal * 100) / 100 })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/v1/cart/:cid/item
router.post('/:cid/item', async (req, res) => {
  try {
    const cid = Number(req.params.cid)
    const { product_id, quantity = 1 } = req.body
    if (!product_id) return res.status(400).json({ error: 'product_id required' })

    // Ensure cart exists
    await execute(
      `MERGE INTO cart c USING DUAL ON (c.customer_id = :cid)
       WHEN NOT MATCHED THEN INSERT (customer_id) VALUES (:cid2)`,
      { cid, cid2: cid }
    )
    // Upsert cart item
    await execute(
      `MERGE INTO cart_items ci
       USING (SELECT cart_id FROM cart WHERE customer_id = :cid) c
       ON (ci.cart_id = c.cart_id AND ci.product_id = :pid)
       WHEN MATCHED     THEN UPDATE SET ci.quantity = ci.quantity + :qty
       WHEN NOT MATCHED THEN INSERT (cart_id, product_id, quantity)
           VALUES (c.cart_id, :pid2, :qty2)`,
      { cid, pid: Number(product_id), qty: Number(quantity), pid2: Number(product_id), qty2: Number(quantity) }
    )
    res.json({ message: 'Item added to cart' })
  } catch (e) { res.status(422).json({ error: e.message }) }
})

// PUT /api/v1/cart/:cid/item/:pid
router.put('/:cid/item/:pid', async (req, res) => {
  try {
    const { quantity } = req.body
    if (!quantity || quantity < 1) return res.status(400).json({ error: 'quantity >= 1 required' })
    await execute(
      `UPDATE cart_items SET quantity = :qty
       WHERE product_id = :pid
         AND cart_id = (SELECT cart_id FROM cart WHERE customer_id = :cid)`,
      { qty: Number(quantity), pid: Number(req.params.pid), cid: Number(req.params.cid) }
    )
    res.json({ message: 'Cart item updated' })
  } catch (e) { res.status(422).json({ error: e.message }) }
})

// DELETE /api/v1/cart/:cid/item/:pid
router.delete('/:cid/item/:pid', async (req, res) => {
  try {
    await execute(
      `DELETE FROM cart_items WHERE product_id = :pid
         AND cart_id = (SELECT cart_id FROM cart WHERE customer_id = :cid)`,
      { pid: Number(req.params.pid), cid: Number(req.params.cid) }
    )
    res.json({ message: 'Item removed from cart' })
  } catch (e) { res.status(422).json({ error: e.message }) }
})

// DELETE /api/v1/cart/:cid
router.delete('/:cid', async (req, res) => {
  try {
    await execute(
      `DELETE FROM cart_items WHERE cart_id = (SELECT cart_id FROM cart WHERE customer_id = :cid)`,
      { cid: Number(req.params.cid) }
    )
    res.json({ message: 'Cart cleared' })
  } catch (e) { res.status(422).json({ error: e.message }) }
})

export default router
