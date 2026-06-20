import { Router } from 'express'
import { query, execute, callProc, oracledb } from '../db.js'

const router = Router()

// GET /api/v1/builder/setups
router.get('/setups', async (req, res) => {
  try {
    const { customer_id } = req.query
    let sql = `SELECT asu.setup_id, asu.setup_name, asu.water_type, asu.status,
                      asu.target_temp_c, asu.target_ph, asu.description,
                      t.volume_liters, p.product_name AS tank_name,
                      TO_CHAR(asu.created_at,'YYYY-MM-DD') AS created_at
               FROM aquarium_setups asu
               JOIN tanks    t ON asu.tank_id  = t.tank_id
               JOIN products p ON t.product_id = p.product_id`
    const binds = {}
    if (customer_id) { sql += ' WHERE asu.customer_id = :cid'; binds.cid = Number(customer_id) }
    sql += ' ORDER BY asu.created_at DESC'
    res.json(await query(sql, binds))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/v1/builder/setup/:id
// Flatten: spread setup fields + items array so setup.SETUP_NAME and setup.items both work
router.get('/setup/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const setup = await query(
      `SELECT asu.*, p.product_name AS tank_name, t.volume_liters
       FROM aquarium_setups asu
       JOIN tanks t ON asu.tank_id = t.tank_id
       JOIN products p ON t.product_id = p.product_id
       WHERE asu.setup_id = :sid`,
      { sid: id }
    )
    if (!setup.length) return res.status(404).json({ error: 'Setup not found' })

    const items = await query(
      `SELECT si.setup_item_id, si.item_type, si.quantity, si.notes,
              p.product_id, p.product_name, p.unit_price, p.image_url
       FROM setup_items si
       JOIN products p ON si.product_id = p.product_id
       WHERE si.setup_id = :sid
       ORDER BY si.item_type, p.product_name`,
      { sid: id }
    )
    // Spread so page can access both setup.SETUP_NAME and setup.items
    res.json({ ...setup[0], items })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/v1/builder/setup
router.post('/setup', async (req, res) => {
  try {
    const { customer_id, tank_id, setup_name, water_type, target_temp_c, target_temp, target_ph, description } = req.body
    if (!customer_id || !tank_id || !setup_name || !water_type)
      return res.status(400).json({ error: 'customer_id, tank_id, setup_name, water_type required' })

    const temp = target_temp_c ?? target_temp ?? null

    const out = await callProc(
      `BEGIN create_aquarium_setup(:cid,:tid,:name,:wt,:temp,:ph,:desc,:sid); END;`,
      {
        cid:  Number(customer_id),
        tid:  Number(tank_id),
        name: setup_name,
        wt:   water_type.toUpperCase(),
        temp: temp != null ? Number(temp) : null,
        ph:   target_ph != null ? Number(target_ph) : null,
        desc: description || null,
        sid:  { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      }
    )
    res.status(201).json({ setup_id: out.sid, message: 'Setup created' })
  } catch (e) { res.status(422).json({ error: e.message }) }
})

// POST /api/v1/builder/setup/:id/item
router.post('/setup/:id/item', async (req, res) => {
  try {
    const { product_id, item_type, quantity = 1 } = req.body
    if (!product_id || !item_type) return res.status(400).json({ error: 'product_id and item_type required' })
    await callProc(
      `BEGIN add_item_to_setup(:sid,:pid,:type,:qty,NULL); END;`,
      { sid: Number(req.params.id), pid: Number(product_id), type: item_type.toUpperCase(), qty: Number(quantity) }
    )
    res.json({ message: 'Item added to setup' })
  } catch (e) { res.status(422).json({ error: e.message }) }
})

// DELETE /api/v1/builder/setup/:id/item/:pid
router.delete('/setup/:id/item/:pid', async (req, res) => {
  try {
    await execute(
      `DELETE FROM setup_items WHERE setup_id = :sid AND product_id = :pid`,
      { sid: Number(req.params.id), pid: Number(req.params.pid) }
    )
    res.json({ message: 'Item removed' })
  } catch (e) { res.status(422).json({ error: e.message }) }
})

// GET /api/v1/builder/setup/:id/validate
// Returns water_ok (NOT water_type_ok) to match AquariumBuilder.jsx: val.water_ok
router.get('/setup/:id/validate', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const [capOut, waterOut, tempOut] = await Promise.all([
      callProc(`BEGIN :result := validate_tank_capacity(:sid); END;`,
        { result: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }, sid: id }),
      callProc(`BEGIN :result := validate_water_type(:sid); END;`,
        { result: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }, sid: id }),
      callProc(`BEGIN :result := validate_temperature(:sid); END;`,
        { result: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }, sid: id }),
    ])
    const capacity_ok = Boolean(capOut.result)
    const water_ok    = Boolean(waterOut.result)
    const temp_ok     = Boolean(tempOut.result)
    res.json({ capacity_ok, water_ok, temp_ok, all_valid: capacity_ok && water_ok && temp_ok })
  } catch (e) { res.status(422).json({ error: e.message }) }
})

// GET /api/v1/builder/setup/:id/price
router.get('/setup/:id/price', async (req, res) => {
  try {
    const out = await callProc(
      `BEGIN :result := get_setup_total_price(:sid); END;`,
      { result: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }, sid: Number(req.params.id) }
    )
    res.json({ setup_id: Number(req.params.id), total_price: out.result ?? 0 })
  } catch (e) { res.status(422).json({ error: e.message }) }
})

// POST /api/v1/builder/setup/:id/save
router.post('/setup/:id/save', async (req, res) => {
  try {
    const { customer_id, share_code, is_public = 0 } = req.body
    if (!customer_id) return res.status(400).json({ error: 'customer_id required' })
    const out = await callProc(
      `BEGIN save_setup(:sid,:cid,:code,:pub,:saved); END;`,
      {
        sid:   Number(req.params.id),
        cid:   Number(customer_id),
        code:  share_code || null,
        pub:   is_public ? 1 : 0,
        saved: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      }
    )
    res.json({ saved_id: out.saved, message: 'Setup saved' })
  } catch (e) { res.status(422).json({ error: e.message }) }
})

// GET /api/v1/builder/tanks  — returns tank products with their actual TANK_ID
router.get('/tanks', async (_req, res) => {
  try {
    const rows = await query(
      `SELECT t.tank_id, t.product_id, p.product_name, p.unit_price,
              t.volume_liters, t.length_cm, t.width_cm, t.height_cm, t.material
       FROM tanks t
       JOIN products p ON t.product_id = p.product_id
       WHERE p.is_active = 1
       ORDER BY p.product_name`
    )
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/v1/builder/compatibility
router.get('/compatibility', async (_req, res) => {
  try {
    const rows = await query(
      `SELECT cr.rule_id, pa.product_name AS product_a, pb.product_name AS product_b,
              cr.rule_type, cr.severity, cr.reason,
              TO_CHAR(cr.created_at,'YYYY-MM-DD') AS created_at
       FROM compatibility_rules cr
       JOIN products pa ON cr.product_id_a = pa.product_id
       JOIN products pb ON cr.product_id_b = pb.product_id
       ORDER BY cr.severity DESC, cr.created_at DESC`
    )
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/v1/builder/compatibility
router.post('/compatibility', async (req, res) => {
  try {
    const { product_id_a, product_id_b, rule_type, severity, reason, created_by } = req.body
    if (!product_id_a || !product_id_b || !rule_type || !severity)
      return res.status(400).json({ error: 'product_id_a, product_id_b, rule_type, severity required' })
    await execute(
      `INSERT INTO compatibility_rules (product_id_a,product_id_b,rule_type,severity,reason,created_by)
       VALUES (:pa,:pb,:rtype,:sev,:reason,:uid)`,
      { pa: Number(product_id_a), pb: Number(product_id_b), rtype: rule_type,
        sev: severity, reason: reason || null, uid: created_by ? Number(created_by) : null }
    )
    res.status(201).json({ message: 'Compatibility rule added' })
  } catch (e) { res.status(422).json({ error: e.message }) }
})

export default router
