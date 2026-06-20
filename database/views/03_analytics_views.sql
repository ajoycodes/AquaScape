-- ============================================================
-- MODULE 9c: ANALYTICS & REPORTING VIEWS
-- ============================================================

-- ============================================================
-- VIEW: vw_profit_analysis
-- Per-order profit margin analysis.
-- ============================================================
CREATE OR REPLACE VIEW vw_profit_analysis AS
SELECT
    o.order_id,
    TO_CHAR(o.order_date, 'YYYY-MM-DD')     AS order_date,
    c.first_name || ' ' || c.last_name      AS customer_name,
    o.total_amount                           AS revenue,
    NVL(SUM(oi.quantity * NVL(p.cost_price, 0)), 0) AS cogs,
    calc_order_profit(o.order_id)            AS gross_profit,
    ROUND(
        calc_order_profit(o.order_id)
        / NULLIF(o.total_amount, 0) * 100, 2
    )                                        AS margin_pct,
    o.order_status
FROM orders      o
JOIN customers   c  ON o.customer_id  = c.customer_id
JOIN order_items oi ON oi.order_id    = o.order_id
JOIN products    p  ON oi.product_id  = p.product_id
WHERE o.order_status NOT IN ('CANCELLED')
GROUP BY o.order_id, o.order_date, c.first_name, c.last_name,
         o.total_amount, o.order_status
ORDER BY o.order_date DESC;

COMMENT ON TABLE vw_profit_analysis IS 'Per-order gross profit and margin — calls calc_order_profit()';

-- ============================================================
-- VIEW: vw_popular_setups
-- Saved aquarium setups ranked by item count and estimated value.
-- ============================================================
CREATE OR REPLACE VIEW vw_popular_setups AS
SELECT
    asu.setup_id,
    asu.setup_name,
    c.first_name || ' ' || c.last_name  AS designer,
    t_prod.product_name                 AS tank_name,
    tk.volume_liters,
    asu.water_type,
    COUNT(DISTINCT si.setup_item_id)    AS item_count,
    NVL(SUM(si.quantity), 0)            AS total_items_qty,
    get_setup_total_price(asu.setup_id) AS estimated_value,
    ss.is_public,
    ss.share_code,
    ss.saved_at
FROM aquarium_setups asu
JOIN saved_setups   ss       ON asu.setup_id   = ss.setup_id
JOIN customers      c        ON asu.customer_id = c.customer_id
JOIN tanks          tk       ON asu.tank_id     = tk.tank_id
JOIN products       t_prod   ON tk.product_id   = t_prod.product_id
LEFT JOIN setup_items si     ON asu.setup_id    = si.setup_id
GROUP BY asu.setup_id, asu.setup_name, c.first_name, c.last_name,
         t_prod.product_name, tk.volume_liters, asu.water_type,
         ss.is_public, ss.share_code, ss.saved_at
ORDER BY estimated_value DESC;

-- ============================================================
-- VIEW: vw_compatibility_failure_report
-- All INCOMPATIBLE rules with how often they've been encountered.
-- ============================================================
CREATE OR REPLACE VIEW vw_compatibility_failure_report AS
SELECT
    cr.rule_id,
    pa.product_name                     AS product_a,
    pb.product_name                     AS product_b,
    cr.rule_type,
    cr.severity,
    cr.reason,
    cr.created_at,
    u.username                          AS created_by
FROM compatibility_rules cr
JOIN products pa ON cr.product_id_a = pa.product_id
JOIN products pb ON cr.product_id_b = pb.product_id
LEFT JOIN users u ON cr.created_by = u.user_id
WHERE cr.rule_type = 'INCOMPATIBLE'
ORDER BY cr.severity DESC, cr.created_at DESC;

-- ============================================================
-- VIEW: vw_product_rating_analysis
-- Products by type, price tier, and sales performance.
-- Simulates a rating based on sell-through velocity.
-- ============================================================
CREATE OR REPLACE VIEW vw_product_rating_analysis AS
SELECT
    p.product_id,
    p.product_name,
    p.product_type,
    p.unit_price,
    CASE
        WHEN p.unit_price < 50   THEN 'BUDGET'
        WHEN p.unit_price < 200  THEN 'MID-RANGE'
        WHEN p.unit_price < 500  THEN 'PREMIUM'
        ELSE 'LUXURY'
    END AS price_tier,
    NVL(sales.units_sold, 0)            AS units_sold,
    NVL(sales.total_revenue, 0)         AS total_revenue,
    i.qty_on_hand,
    -- Sell-through rate: units sold / (units sold + current stock)
    CASE
        WHEN NVL(sales.units_sold,0) + i.qty_on_hand = 0 THEN 0
        ELSE ROUND(
            NVL(sales.units_sold,0) /
            NULLIF(NVL(sales.units_sold,0) + i.qty_on_hand, 0) * 100, 1
        )
    END AS sell_through_pct,
    CASE
        WHEN NVL(sales.units_sold, 0) > 50  THEN 5
        WHEN NVL(sales.units_sold, 0) > 20  THEN 4
        WHEN NVL(sales.units_sold, 0) > 10  THEN 3
        WHEN NVL(sales.units_sold, 0) > 0   THEN 2
        ELSE 1
    END AS popularity_score
FROM products p
LEFT JOIN inventory i ON i.product_id = p.product_id
LEFT JOIN (
    SELECT oi.product_id,
           SUM(oi.quantity)   AS units_sold,
           SUM(oi.line_total) AS total_revenue
    FROM   order_items oi
    JOIN   orders o ON oi.order_id = o.order_id
    WHERE  o.order_status NOT IN ('CANCELLED','REFUNDED')
    GROUP BY oi.product_id
) sales ON sales.product_id = p.product_id
WHERE p.is_active = 1
ORDER BY popularity_score DESC, units_sold DESC;

-- ============================================================
-- VIEW: vw_audit_log_summary
-- Human-readable audit trail with context.
-- ============================================================
CREATE OR REPLACE VIEW vw_audit_log_summary AS
SELECT
    al.audit_id,
    al.table_name,
    al.operation,
    al.record_id,
    al.changed_by,
    TO_CHAR(al.changed_at, 'YYYY-MM-DD HH24:MI:SS') AS changed_at,
    al.old_values,
    al.new_values
FROM audit_log al
ORDER BY al.changed_at DESC;

-- ============================================================
-- VIEW: vw_dashboard_kpis
-- Single-row KPI snapshot for the admin dashboard.
-- ============================================================
CREATE OR REPLACE VIEW vw_dashboard_kpis AS
SELECT
    (SELECT COUNT(*)          FROM orders     WHERE order_status NOT IN ('CANCELLED','REFUNDED'))     AS total_orders,
    (SELECT COUNT(*)          FROM orders     WHERE order_date >= TRUNC(SYSDATE,'MM'))                AS orders_this_month,
    (SELECT NVL(SUM(total_amount),0) FROM orders WHERE order_status NOT IN ('CANCELLED','REFUNDED')
                                               AND order_date >= TRUNC(SYSDATE,'MM'))                AS revenue_this_month,
    (SELECT COUNT(*)          FROM low_stock_alerts WHERE is_resolved = 0)                           AS open_low_stock_alerts,
    (SELECT COUNT(*)          FROM inventory   WHERE qty_on_hand = 0)                                AS out_of_stock_count,
    (SELECT COUNT(*)          FROM customers   WHERE is_active = 1)                                  AS active_customers,
    (SELECT COUNT(*)          FROM products    WHERE is_active = 1)                                  AS active_products,
    (SELECT COUNT(*)          FROM supplier_po WHERE po_status IN ('SUBMITTED','APPROVED'))           AS pending_pos,
    (SELECT COUNT(*)          FROM returns     WHERE return_status = 'REQUESTED')                    AS pending_returns,
    (SELECT NVL(SUM(qty_on_hand * NVL(p.cost_price,0)),0)
     FROM inventory i JOIN products p ON i.product_id = p.product_id)                               AS total_stock_value
FROM DUAL;

COMMENT ON TABLE vw_dashboard_kpis IS 'Single-query dashboard KPI row — DUAL-based for zero-join performance';

PROMPT Analytics views created.
