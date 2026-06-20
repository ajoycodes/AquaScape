-- ============================================================
-- MODULE 9b: SALES & ORDER VIEWS
-- ============================================================

-- ============================================================
-- VIEW: vw_monthly_sales
-- Revenue breakdown per calendar month.
-- ============================================================
CREATE OR REPLACE VIEW vw_monthly_sales AS
SELECT
    TO_CHAR(o.order_date, 'YYYY-MM')    AS sale_month,
    TO_CHAR(o.order_date, 'Mon YYYY')   AS month_label,
    COUNT(o.order_id)                   AS order_count,
    SUM(o.subtotal)                     AS gross_sales,
    SUM(o.discount_total)               AS total_discounts,
    SUM(o.tax_amount)                   AS total_tax,
    SUM(o.total_amount)                 AS net_revenue,
    ROUND(AVG(o.total_amount), 2)       AS avg_order_value,
    COUNT(DISTINCT o.customer_id)       AS unique_customers
FROM orders o
WHERE o.order_status NOT IN ('CANCELLED','REFUNDED')
GROUP BY TO_CHAR(o.order_date, 'YYYY-MM'), TO_CHAR(o.order_date, 'Mon YYYY')
ORDER BY sale_month DESC;

COMMENT ON TABLE vw_monthly_sales IS 'Monthly revenue roll-up — excludes cancelled/refunded orders';

-- ============================================================
-- VIEW: vw_best_selling_fish
-- Fish products ranked by total units sold.
-- ============================================================
CREATE OR REPLACE VIEW vw_best_selling_fish AS
SELECT
    p.product_id,
    p.product_name,
    f.species,
    f.water_type,
    f.care_level,
    SUM(oi.quantity)                    AS units_sold,
    SUM(oi.line_total)                  AS total_revenue,
    COUNT(DISTINCT oi.order_id)         AS orders_in,
    ROUND(AVG(oi.unit_price), 2)        AS avg_sell_price,
    i.qty_on_hand                       AS current_stock
FROM order_items oi
JOIN orders   o  ON oi.order_id   = o.order_id
JOIN products p  ON oi.product_id = p.product_id
JOIN fish     f  ON f.product_id  = p.product_id
JOIN inventory i ON i.product_id  = p.product_id
WHERE o.order_status NOT IN ('CANCELLED','REFUNDED')
GROUP BY p.product_id, p.product_name, f.species, f.water_type,
         f.care_level, i.qty_on_hand
ORDER BY units_sold DESC;

-- ============================================================
-- VIEW: vw_customer_purchase_history
-- Per-customer order summary with lifetime value.
-- ============================================================
CREATE OR REPLACE VIEW vw_customer_purchase_history AS
SELECT
    c.customer_id,
    c.first_name || ' ' || c.last_name      AS customer_name,
    c.email,
    c.city,
    c.country,
    COUNT(o.order_id)                        AS total_orders,
    NVL(SUM(o.total_amount), 0)              AS lifetime_value,
    NVL(ROUND(AVG(o.total_amount), 2), 0)   AS avg_order_value,
    MIN(o.order_date)                        AS first_order_date,
    MAX(o.order_date)                        AS last_order_date,
    CASE
        WHEN COUNT(o.order_id) = 0 THEN 'NEW'
        WHEN SUM(o.total_amount) >= 2000     THEN 'VIP'
        WHEN SUM(o.total_amount) >= 500      THEN 'REGULAR'
        ELSE 'OCCASIONAL'
    END AS customer_tier
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
                  AND o.order_status NOT IN ('CANCELLED','REFUNDED')
WHERE c.is_active = 1
GROUP BY c.customer_id, c.first_name, c.last_name, c.email, c.city, c.country
ORDER BY lifetime_value DESC NULLS LAST;

-- ============================================================
-- VIEW: vw_fast_movers
-- Products with most units sold in the last 30 days.
-- ============================================================
CREATE OR REPLACE VIEW vw_fast_movers AS
SELECT
    p.product_id,
    p.product_name,
    p.product_type,
    c.category_name,
    SUM(oi.quantity)                    AS qty_sold_30d,
    SUM(oi.line_total)                  AS revenue_30d,
    COUNT(DISTINCT oi.order_id)         AS order_count_30d,
    i.qty_on_hand                       AS current_stock,
    CASE WHEN i.qty_on_hand <= i.reorder_level THEN 'REORDER NOW' ELSE 'OK' END AS stock_alert
FROM order_items oi
JOIN orders    o  ON oi.order_id    = o.order_id
JOIN products  p  ON oi.product_id  = p.product_id
JOIN categories c ON p.category_id  = c.category_id
JOIN inventory  i ON i.product_id   = p.product_id
WHERE o.order_date   >= SYSDATE - 30
  AND o.order_status NOT IN ('CANCELLED','REFUNDED')
GROUP BY p.product_id, p.product_name, p.product_type,
         c.category_name, i.qty_on_hand, i.reorder_level
ORDER BY qty_sold_30d DESC;

-- ============================================================
-- VIEW: vw_order_details
-- Full order details with customer, items, and payment.
-- ============================================================
CREATE OR REPLACE VIEW vw_order_details AS
SELECT
    o.order_id,
    o.order_date,
    o.order_status,
    c.first_name || ' ' || c.last_name  AS customer_name,
    c.email                             AS customer_email,
    p.product_name,
    oi.quantity,
    oi.unit_price,
    oi.line_total,
    o.subtotal,
    o.discount_total,
    o.tax_amount,
    o.total_amount,
    py.payment_method,
    py.payment_status,
    o.shipping_addr
FROM orders      o
JOIN customers   c   ON o.customer_id  = c.customer_id
JOIN order_items oi  ON oi.order_id    = o.order_id
JOIN products    p   ON oi.product_id  = p.product_id
LEFT JOIN payments py ON py.order_id   = o.order_id
ORDER BY o.order_date DESC, o.order_id;

PROMPT Sales views created.
