-- ============================================================
-- MODULE 9a: INVENTORY & STOCK VIEWS
-- ============================================================

-- ============================================================
-- VIEW: vw_low_stock
-- Products at or below their reorder level.
-- Shows shortage gap and reorder recommendation.
-- ============================================================
CREATE OR REPLACE VIEW vw_low_stock AS
SELECT
    p.product_id,
    p.product_name,
    p.product_type,
    p.sku,
    i.qty_on_hand,
    i.qty_reserved,
    (i.qty_on_hand - i.qty_reserved)   AS qty_available,
    i.reorder_level,
    i.reorder_qty,
    (i.reorder_level - i.qty_on_hand)  AS shortage_qty,
    NVL(a.alert_date, SYSDATE)          AS alert_since,
    CASE
        WHEN i.qty_on_hand = 0 THEN 'OUT OF STOCK'
        WHEN i.qty_on_hand <= i.reorder_level THEN 'LOW STOCK'
        ELSE 'OK'
    END AS stock_status
FROM inventory i
JOIN products  p ON i.product_id = p.product_id
LEFT JOIN (
    SELECT product_id, MIN(alert_date) AS alert_date
    FROM   low_stock_alerts
    WHERE  is_resolved = 0
    GROUP BY product_id
) a ON a.product_id = i.product_id
WHERE i.qty_on_hand <= i.reorder_level
  AND p.is_active    = 1
ORDER BY shortage_qty DESC, i.qty_on_hand ASC;

COMMENT ON TABLE vw_low_stock IS 'Products at or below reorder level — used by dashboard alerts';

-- ============================================================
-- VIEW: vw_inventory_summary
-- Full inventory snapshot with product details and stock status.
-- ============================================================
CREATE OR REPLACE VIEW vw_inventory_summary AS
SELECT
    p.product_id,
    p.product_name,
    p.product_type,
    c.category_name,
    p.unit_price,
    p.cost_price,
    i.qty_on_hand,
    i.qty_reserved,
    (i.qty_on_hand - i.qty_reserved)            AS qty_available,
    i.reorder_level,
    i.reorder_qty,
    ROUND(i.qty_on_hand * NVL(p.cost_price, 0), 2) AS stock_value,
    i.last_updated,
    CASE
        WHEN i.qty_on_hand = 0              THEN 'OUT_OF_STOCK'
        WHEN i.qty_on_hand <= i.reorder_level THEN 'LOW_STOCK'
        WHEN i.qty_on_hand <= i.reorder_level * 1.5 THEN 'MODERATE'
        ELSE 'HEALTHY'
    END AS stock_health
FROM inventory i
JOIN products   p ON i.product_id  = p.product_id
JOIN categories c ON p.category_id = c.category_id
WHERE p.is_active = 1
ORDER BY stock_health, p.product_name;

-- ============================================================
-- VIEW: vw_supplier_inventory
-- Per-supplier summary of products supplied and stock value.
-- ============================================================
CREATE OR REPLACE VIEW vw_supplier_inventory AS
SELECT
    s.supplier_id,
    s.supplier_name,
    s.country,
    COUNT(DISTINCT spoi.product_id)                          AS products_supplied,
    SUM(spoi.quantity_recv)                                  AS total_units_received,
    SUM(spoi.quantity_recv * spoi.unit_cost)                 AS total_stock_cost,
    COUNT(DISTINCT spo.po_id)                                AS total_pos,
    MAX(spo.received_date)                                   AS last_delivery_date
FROM suppliers          s
JOIN supplier_po        spo  ON spo.supplier_id = s.supplier_id
JOIN supplier_po_items  spoi ON spoi.po_id      = spo.po_id
WHERE spo.po_status = 'RECEIVED'
GROUP BY s.supplier_id, s.supplier_name, s.country
ORDER BY total_stock_cost DESC;

-- ============================================================
-- VIEW: vw_stock_movement_log
-- Last 500 inventory movements with product and user info.
-- ============================================================
CREATE OR REPLACE VIEW vw_stock_movement_log AS
SELECT
    im.movement_id,
    p.product_name,
    p.product_type,
    im.movement_type,
    im.quantity_delta,
    im.qty_after,
    im.reference_id,
    im.reference_type,
    im.moved_at,
    NVL(u.username, 'SYSTEM (trigger)') AS performed_by
FROM inventory_movements im
JOIN products p ON im.product_id   = p.product_id
LEFT JOIN users u ON im.performed_by = u.user_id
ORDER BY im.moved_at DESC;

PROMPT Inventory views created.
