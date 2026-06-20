import { Router } from 'express'
import { query } from '../db.js'

const router = Router()

// GET /api/v1/reports/dashboard
// Returns vw_dashboard_kpis + extra counts the frontend expects
router.get('/dashboard', async (_req, res) => {
  try {
    const rows = await query(`
      SELECT v.*,
             v.ACTIVE_PRODUCTS  AS TOTAL_PRODUCTS,
             v.ACTIVE_CUSTOMERS AS TOTAL_CUSTOMERS,
             (SELECT COUNT(*) FROM suppliers WHERE is_active = 1) AS TOTAL_SUPPLIERS,
             (SELECT COUNT(*) FROM orders
              WHERE order_status IN ('PENDING','CONFIRMED','PROCESSING')) AS PENDING_ORDERS,
             (SELECT COUNT(*) FROM aquarium_setups
              WHERE status NOT IN ('CANCELLED')) AS ACTIVE_SETUPS
      FROM vw_dashboard_kpis v
    `)
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/v1/reports/monthly-sales
// Alias NET_REVENUE → TOTAL_REVENUE so charts work
// Supports: months, date_from (YYYY-MM-DD), date_to (YYYY-MM-DD)
router.get('/monthly-sales', async (req, res) => {
  try {
    const { months = 12, date_from, date_to } = req.query
    const binds = {}
    let where = ''
    if (date_from) { where += ' AND SALE_MONTH >= TO_DATE(:df, \'YYYY-MM-DD\')'; binds.df = date_from }
    if (date_to)   { where += ' AND SALE_MONTH <= TO_DATE(:dt, \'YYYY-MM-DD\')'; binds.dt = date_to   }

    let sql = `SELECT SALE_MONTH, MONTH_LABEL, ORDER_COUNT, UNIQUE_CUSTOMERS,
                      GROSS_SALES, TOTAL_DISCOUNTS, TOTAL_TAX,
                      NET_REVENUE AS TOTAL_REVENUE, AVG_ORDER_VALUE
               FROM vw_monthly_sales
               WHERE 1=1${where}
               ORDER BY SALE_MONTH DESC`

    if (!date_from && !date_to) {
      sql = `SELECT * FROM (${sql}) WHERE ROWNUM <= :lim`
      binds.lim = Number(months)
    }

    res.json(await query(sql, binds))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/v1/reports/best-sellers
// Alias UNITS_SOLD → TOTAL_SOLD, ORDERS_IN → ORDER_COUNT
router.get('/best-sellers', async (req, res) => {
  try {
    const limit = Number(req.query.limit ?? 10)
    const rows = await query(
      `SELECT PRODUCT_ID, PRODUCT_NAME, SPECIES, WATER_TYPE, CARE_LEVEL,
              UNITS_SOLD    AS TOTAL_SOLD,
              TOTAL_REVENUE,
              ORDERS_IN     AS ORDER_COUNT,
              AVG_SELL_PRICE, CURRENT_STOCK
       FROM vw_best_selling_fish
       WHERE ROWNUM <= :lim`,
      { lim: limit }
    )
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/v1/reports/low-stock
router.get('/low-stock', async (_req, res) => {
  try {
    res.json(await query('SELECT * FROM vw_low_stock ORDER BY QTY_ON_HAND'))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/v1/reports/profit
// Supports: limit, date_from (YYYY-MM-DD), date_to (YYYY-MM-DD)
router.get('/profit', async (req, res) => {
  try {
    const { limit = 50, date_from, date_to } = req.query
    const binds = { lim: Number(limit) }
    let dateWhere = ''
    if (date_from) { dateWhere += ' AND o.order_date >= TO_DATE(:df, \'YYYY-MM-DD\')'; binds.df = date_from }
    if (date_to)   { dateWhere += ' AND o.order_date <= TO_DATE(:dt, \'YYYY-MM-DD\')'; binds.dt = date_to   }

    const rows = await query(
      `SELECT * FROM (
         SELECT o.order_id,
                c.first_name || ' ' || c.last_name AS customer_name,
                o.total_amount AS revenue,
                SUM(oi.quantity * NVL(p.cost_price,0)) AS cogs,
                o.total_amount - SUM(oi.quantity * NVL(p.cost_price,0)) AS profit,
                CASE WHEN o.total_amount > 0
                     THEN ROUND(
                       (o.total_amount - SUM(oi.quantity * NVL(p.cost_price,0)))
                       / o.total_amount * 100, 1)
                     ELSE 0 END AS margin_pct
         FROM orders o
         JOIN customers c    ON o.customer_id  = c.customer_id
         JOIN order_items oi ON oi.order_id    = o.order_id
         JOIN products p     ON oi.product_id  = p.product_id
         WHERE o.order_status NOT IN ('CANCELLED','REFUNDED')${dateWhere}
         GROUP BY o.order_id, c.first_name, c.last_name, o.total_amount
         ORDER BY profit DESC
       ) WHERE ROWNUM <= :lim`,
      binds
    )
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/v1/reports/fast-movers
// Alias QTY_SOLD_30D → UNITS_SOLD_30D
router.get('/fast-movers', async (_req, res) => {
  try {
    const rows = await query(
      `SELECT PRODUCT_ID, PRODUCT_NAME, PRODUCT_TYPE, CATEGORY_NAME,
              QTY_SOLD_30D    AS UNITS_SOLD_30D,
              REVENUE_30D, ORDER_COUNT_30D, CURRENT_STOCK, STOCK_ALERT
       FROM vw_fast_movers
       ORDER BY QTY_SOLD_30D DESC`
    )
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/v1/reports/audit-log
// Alias AUDIT_ID → LOG_ID, OPERATION → ACTION; build DESCRIPTION from table/operation/record
router.get('/audit-log', async (req, res) => {
  try {
    const { table, action, search, limit = 100 } = req.query
    let sql = `SELECT AUDIT_ID AS LOG_ID, TABLE_NAME, OPERATION AS ACTION,
                      RECORD_ID, CHANGED_BY,
                      'Changed ' || TABLE_NAME || ' #' || RECORD_ID AS DESCRIPTION,
                      CHANGED_AT, OLD_VALUES, NEW_VALUES
               FROM vw_audit_log_summary
               WHERE 1=1`
    const binds = {}

    if (table)  { sql += ' AND TABLE_NAME = :tbl';     binds.tbl = table.toUpperCase() }
    if (action) { sql += ' AND OPERATION  = :action';  binds.action = action.toUpperCase() }
    if (search) {
      sql += ' AND (UPPER(OLD_VALUES) LIKE UPPER(:s) OR UPPER(NEW_VALUES) LIKE UPPER(:s2))'
      binds.s  = `%${search}%`
      binds.s2 = `%${search}%`
    }

    sql = `SELECT * FROM (${sql} ORDER BY CHANGED_AT DESC) WHERE ROWNUM <= :lim`
    binds.lim = Number(limit)
    res.json(await query(sql, binds))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/v1/reports/stock-movements
// Supports: product_id, type, date_from, date_to, limit
router.get('/stock-movements', async (req, res) => {
  try {
    const { product_id, type, date_from, date_to, limit = 100 } = req.query
    const binds = {}
    let sql = 'SELECT * FROM vw_stock_movement_log WHERE 1=1'

    if (product_id) {
      sql = `SELECT m.* FROM vw_stock_movement_log m
             JOIN products p ON p.product_name = m.product_name
             WHERE p.product_id = :pid`
      binds.pid = Number(product_id)
      if (type) { sql += ' AND m.MOVEMENT_TYPE = :mtype'; binds.mtype = type.toUpperCase() }
      if (date_from) { sql += ' AND m.MOVED_AT >= TO_DATE(:df, \'YYYY-MM-DD\')'; binds.df = date_from }
      if (date_to)   { sql += ' AND m.MOVED_AT <  TO_DATE(:dt, \'YYYY-MM-DD\') + 1'; binds.dt = date_to }
    } else {
      if (type)      { sql += ' AND MOVEMENT_TYPE = :mtype'; binds.mtype = type.toUpperCase() }
      if (date_from) { sql += ' AND MOVED_AT >= TO_DATE(:df, \'YYYY-MM-DD\')'; binds.df = date_from }
      if (date_to)   { sql += ' AND MOVED_AT <  TO_DATE(:dt, \'YYYY-MM-DD\') + 1'; binds.dt = date_to }
    }

    sql = `SELECT * FROM (${sql} ORDER BY MOVED_AT DESC) WHERE ROWNUM <= :lim`
    binds.lim = Number(limit)
    res.json(await query(sql, binds))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/v1/reports/supplier-inventory
router.get('/supplier-inventory', async (_req, res) => {
  try {
    res.json(await query('SELECT * FROM vw_supplier_inventory'))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/v1/reports/customer-history
router.get('/customer-history', async (req, res) => {
  try {
    const limit = Number(req.query.limit ?? 50)
    const rows = await query(
      'SELECT * FROM (SELECT * FROM vw_customer_purchase_history) WHERE ROWNUM <= :lim',
      { lim: limit }
    )
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/v1/reports/compatibility
router.get('/compatibility', async (_req, res) => {
  try {
    res.json(await query('SELECT * FROM vw_compatibility_failure_report'))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/v1/reports/product-ratings
router.get('/product-ratings', async (_req, res) => {
  try {
    res.json(await query('SELECT * FROM vw_product_rating_analysis'))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/v1/reports/oracle-objects
// Returns USER_OBJECTS counts by type + invalid count + full object list for key types
router.get('/oracle-objects', async (_req, res) => {
  try {
    const [counts, invalidRow, objects] = await Promise.all([
      query(`SELECT object_type, COUNT(*) AS object_count
             FROM user_objects
             WHERE object_type IN ('TABLE','VIEW','PROCEDURE','FUNCTION',
                                   'TRIGGER','SEQUENCE','INDEX','PACKAGE')
             GROUP BY object_type
             ORDER BY object_type`),
      query(`SELECT COUNT(*) AS invalid_count FROM user_objects WHERE status = 'INVALID'`),
      query(`SELECT object_name, object_type, status,
                    TO_CHAR(last_ddl_time, 'YYYY-MM-DD HH24:MI') AS last_ddl_time
             FROM user_objects
             WHERE object_type IN ('PROCEDURE','FUNCTION','TRIGGER','VIEW')
             ORDER BY object_type, object_name`),
    ])
    res.json({
      counts,
      invalid_count: invalidRow[0]?.INVALID_COUNT ?? 0,
      objects,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
