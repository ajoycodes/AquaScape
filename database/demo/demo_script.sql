-- ============================================================
-- MODULE 13: AQUASCAPE DEMO SCRIPT
-- Full walkthrough for professor/TA presentation.
-- Run each numbered step in sequence with DBMS_OUTPUT enabled.
-- SET SERVEROUTPUT ON SIZE UNLIMITED before running.
-- ============================================================
--
-- DEMO FLOW:
--   Step 1  — Verify schema (table/view/procedure counts)
--   Step 2  — Trigger demo: compatibility check (block)
--   Step 3  — Trigger demo: water-type mismatch (block)
--   Step 4  — Trigger demo: stock guard (prevent negative)
--   Step 5  — Procedure demo: place_order full ACID flow
--   Step 6  — Procedure demo: cancel_order with stock restore
--   Step 7  — Function demo: compatibility + validation
--   Step 8  — View demo: vw_dashboard_kpis single-row KPIs
--   Step 9  — View demo: sales + profit analytics
--   Step 10 — Supplier PO lifecycle end-to-end
-- ============================================================

SET SERVEROUTPUT ON SIZE UNLIMITED
SET LINESIZE 200
SET PAGESIZE 100

-- ============================================================
-- STEP 1: SCHEMA VERIFICATION
-- Shows all objects created in the AQUASCAPE schema.
-- ============================================================

PROMPT ============================================================
PROMPT STEP 1: Schema Verification
PROMPT ============================================================

-- Table count
SELECT 'Tables'     AS object_type, COUNT(*) AS count FROM user_tables
UNION ALL
SELECT 'Views',     COUNT(*) FROM user_views
UNION ALL
SELECT 'Procedures',COUNT(*) FROM user_procedures WHERE object_type = 'PROCEDURE'
UNION ALL
SELECT 'Functions', COUNT(*) FROM user_procedures WHERE object_type = 'FUNCTION'
UNION ALL
SELECT 'Triggers',  COUNT(*) FROM user_triggers
UNION ALL
SELECT 'Sequences', COUNT(*) FROM user_sequences;

-- List all tables with row counts
SELECT t.table_name,
       TO_NUMBER(
           EXTRACTVALUE(
               XMLTYPE(DBMS_XMLGEN.GETXML('SELECT COUNT(*) c FROM "'||t.table_name||'"')),
               '/ROWSET/ROW/C'
           )
       ) AS row_count
FROM user_tables t
ORDER BY t.table_name;

-- ============================================================
-- STEP 2: TRIGGER DEMO — Compatibility Check (trg_compat_check)
-- Attempting to add a Betta and a Neon Tetra to the same setup.
-- trg_compat_check should RAISE_APPLICATION_ERROR -20200.
-- ============================================================

PROMPT ============================================================
PROMPT STEP 2: Trigger — Compatibility Block (Betta vs Neon Tetra)
PROMPT ============================================================

DECLARE
    v_cid    NUMBER;
    v_tank   NUMBER;
    v_setup  NUMBER;
    v_betta  NUMBER;
    v_neon   NUMBER;
BEGIN
    -- Get IDs
    SELECT customer_id INTO v_cid  FROM customers WHERE email = 'marcus.reid@email.com';
    SELECT tank_id     INTO v_tank FROM tanks t
        JOIN products p ON t.product_id = p.product_id
        WHERE p.product_name = 'AquaClear 60L Starter Tank';
    SELECT product_id  INTO v_betta FROM products WHERE product_name = 'Betta Splendens (Male)';
    SELECT product_id  INTO v_neon  FROM products WHERE product_name = 'Neon Tetra';

    -- Create a test setup
    create_aquarium_setup(
        p_customer_id => v_cid,
        p_tank_id     => v_tank,
        p_setup_name  => 'DEMO TEST SETUP — will be cleaned up',
        p_water_type  => 'FRESHWATER',
        p_setup_id    => v_setup
    );
    DBMS_OUTPUT.PUT_LINE('Setup created: ' || v_setup);

    -- Add Betta — should succeed
    add_item_to_setup(v_setup, v_betta, 'FISH', 1);
    DBMS_OUTPUT.PUT_LINE('Betta added successfully');

    -- Add Neon Tetra — SHOULD FAIL (compatibility conflict)
    BEGIN
        add_item_to_setup(v_setup, v_neon, 'FISH', 6);
        DBMS_OUTPUT.PUT_LINE('ERROR: Neon should have been blocked!');
    EXCEPTION
        WHEN OTHERS THEN
            DBMS_OUTPUT.PUT_LINE('BLOCKED as expected: ' || SQLERRM);
    END;

    -- Cleanup
    DELETE FROM setup_items WHERE setup_id = v_setup;
    DELETE FROM aquarium_setups WHERE setup_id = v_setup;
    COMMIT;
    DBMS_OUTPUT.PUT_LINE('Test setup cleaned up.');
END;
/

-- ============================================================
-- STEP 3: TRIGGER DEMO — Water Type Mismatch (trg_validate_water_item)
-- Attempting to add a saltwater fish (Clownfish) to a freshwater setup.
-- ============================================================

PROMPT ============================================================
PROMPT STEP 3: Trigger — Water Type Mismatch Block
PROMPT ============================================================

DECLARE
    v_cid    NUMBER;
    v_tank   NUMBER;
    v_setup  NUMBER;
    v_clown  NUMBER;
BEGIN
    SELECT customer_id INTO v_cid  FROM customers WHERE email = 'noah.fischer@email.com';
    SELECT tank_id     INTO v_tank FROM tanks t
        JOIN products p ON t.product_id = p.product_id
        WHERE p.product_name = 'AquaClear 60L Starter Tank';
    SELECT product_id  INTO v_clown FROM products WHERE product_name = 'Ocellaris Clownfish';

    create_aquarium_setup(
        p_customer_id => v_cid,
        p_tank_id     => v_tank,
        p_setup_name  => 'DEMO WATER TYPE TEST',
        p_water_type  => 'FRESHWATER',  -- ← freshwater setup
        p_setup_id    => v_setup
    );

    BEGIN
        -- Clownfish is SALTWATER — trigger fires and blocks
        add_item_to_setup(v_setup, v_clown, 'FISH', 1);
        DBMS_OUTPUT.PUT_LINE('ERROR: Saltwater fish should have been blocked!');
    EXCEPTION
        WHEN OTHERS THEN
            DBMS_OUTPUT.PUT_LINE('BLOCKED as expected: ' || SQLERRM);
    END;

    -- Cleanup
    DELETE FROM aquarium_setups WHERE setup_id = v_setup;
    COMMIT;
END;
/

-- ============================================================
-- STEP 4: TRIGGER DEMO — Negative Stock Guard (trg_no_negative_stock)
-- Attempting to set qty_on_hand below 0 directly.
-- ============================================================

PROMPT ============================================================
PROMPT STEP 4: Trigger — Negative Stock Prevention
PROMPT ============================================================

DECLARE
    v_pid NUMBER;
    v_cur NUMBER;
BEGIN
    SELECT product_id INTO v_pid FROM products WHERE product_name = 'Corydoras Catfish';
    SELECT qty_on_hand INTO v_cur FROM inventory WHERE product_id = v_pid;
    DBMS_OUTPUT.PUT_LINE('Current corydoras stock: ' || v_cur);

    -- Try update_inventory with a delta that exceeds stock
    BEGIN
        update_inventory(
            p_product_id => v_pid,
            p_delta      => -(v_cur + 99),  -- guaranteed to go negative
            p_move_type  => 'ADJUSTMENT',
            p_user_id    => 1,
            p_notes      => 'Demo: deliberate over-deduction attempt'
        );
        DBMS_OUTPUT.PUT_LINE('ERROR: Should have been blocked!');
    EXCEPTION
        WHEN OTHERS THEN
            DBMS_OUTPUT.PUT_LINE('BLOCKED as expected: ' || SQLERRM);
    END;

    -- Verify stock unchanged
    SELECT qty_on_hand INTO v_cur FROM inventory WHERE product_id = v_pid;
    DBMS_OUTPUT.PUT_LINE('Stock after failed attempt (unchanged): ' || v_cur);
END;
/

-- ============================================================
-- STEP 5: PROCEDURE DEMO — place_order ACID Flow
-- Leo Santos buys Zebra Danios and a Starter Tank.
-- Shows: cart→order→stock deduction→movement log in one transaction.
-- ============================================================

PROMPT ============================================================
PROMPT STEP 5: Procedure — place_order (Full ACID Flow)
PROMPT ============================================================

DECLARE
    v_cid    NUMBER;
    v_danio  NUMBER;
    v_tank   NUMBER;
    v_oid    NUMBER;
    v_stock_before NUMBER;
    v_stock_after  NUMBER;
BEGIN
    SELECT customer_id INTO v_cid   FROM customers WHERE email = 'leo.santos@email.com';
    SELECT product_id  INTO v_danio FROM products  WHERE product_name = 'Zebra Danio';
    SELECT product_id  INTO v_tank  FROM products  WHERE product_name = 'AquaClear 60L Starter Tank';

    -- Stock before
    SELECT qty_on_hand INTO v_stock_before FROM inventory WHERE product_id = v_danio;
    DBMS_OUTPUT.PUT_LINE('Zebra Danio stock BEFORE order: ' || v_stock_before);

    -- Build cart
    MERGE INTO cart_items ci
    USING (SELECT cart_id FROM cart WHERE customer_id = v_cid) c
    ON (ci.cart_id = c.cart_id AND ci.product_id = v_danio)
    WHEN MATCHED    THEN UPDATE SET ci.quantity = 8
    WHEN NOT MATCHED THEN INSERT (cart_id, product_id, quantity)
        VALUES (c.cart_id, v_danio, 8);

    MERGE INTO cart_items ci
    USING (SELECT cart_id FROM cart WHERE customer_id = v_cid) c
    ON (ci.cart_id = c.cart_id AND ci.product_id = v_tank)
    WHEN MATCHED    THEN UPDATE SET ci.quantity = 1
    WHEN NOT MATCHED THEN INSERT (cart_id, product_id, quantity)
        VALUES (c.cart_id, v_tank, 1);

    -- Place order with 10% discount
    place_order(
        p_customer_id   => v_cid,
        p_user_id       => 1,
        p_discount_code => 'WELCOME10',
        p_order_id      => v_oid
    );
    DBMS_OUTPUT.PUT_LINE('Order placed: #' || v_oid);

    -- Verify stock was deducted
    SELECT qty_on_hand INTO v_stock_after FROM inventory WHERE product_id = v_danio;
    DBMS_OUTPUT.PUT_LINE('Zebra Danio stock AFTER order:  ' || v_stock_after);
    DBMS_OUTPUT.PUT_LINE('Stock deducted: ' || (v_stock_before - v_stock_after));

    -- Show order header
    FOR r IN (
        SELECT order_id, status, subtotal, tax_amount, total_amount
        FROM   orders WHERE order_id = v_oid
    ) LOOP
        DBMS_OUTPUT.PUT_LINE(
            'Order #' || r.order_id ||
            ' | Status: ' || r.STATUS ||
            ' | Subtotal: $' || r.SUBTOTAL ||
            ' | Tax: $' || r.TAX_AMOUNT ||
            ' | Total: $' || r.TOTAL_AMOUNT
        );
    END LOOP;

    -- Show movement log entry
    FOR r IN (
        SELECT movement_type, quantity_delta, qty_after, notes
        FROM   inventory_movements
        WHERE  product_id = v_danio AND reference_id = v_oid
    ) LOOP
        DBMS_OUTPUT.PUT_LINE(
            'Movement: ' || r.MOVEMENT_TYPE ||
            ' | Delta: ' || r.QUANTITY_DELTA ||
            ' | After: ' || r.QTY_AFTER
        );
    END LOOP;
END;
/

-- ============================================================
-- STEP 6: PROCEDURE DEMO — cancel_order with stock restore
-- Cancels the order placed in Step 5 and verifies stock is restored.
-- ============================================================

PROMPT ============================================================
PROMPT STEP 6: Procedure — cancel_order (Stock Rollback)
PROMPT ============================================================

DECLARE
    v_cid   NUMBER;
    v_oid   NUMBER;
    v_danio NUMBER;
    v_stock_before NUMBER;
    v_stock_after  NUMBER;
BEGIN
    SELECT customer_id INTO v_cid   FROM customers WHERE email = 'leo.santos@email.com';
    SELECT product_id  INTO v_danio FROM products  WHERE product_name = 'Zebra Danio';

    -- Find the PENDING order placed in step 5
    SELECT MAX(order_id) INTO v_oid
    FROM   orders WHERE customer_id = v_cid AND status = 'PENDING';

    SELECT qty_on_hand INTO v_stock_before FROM inventory WHERE product_id = v_danio;
    DBMS_OUTPUT.PUT_LINE('Stock BEFORE cancel: ' || v_stock_before);

    cancel_order(
        p_order_id => v_oid,
        p_user_id  => 1,
        p_reason   => 'Demo cancellation to illustrate stock restore'
    );
    DBMS_OUTPUT.PUT_LINE('Order #' || v_oid || ' cancelled.');

    SELECT qty_on_hand INTO v_stock_after FROM inventory WHERE product_id = v_danio;
    DBMS_OUTPUT.PUT_LINE('Stock AFTER cancel:  ' || v_stock_after);
    DBMS_OUTPUT.PUT_LINE('Stock restored:      ' || (v_stock_after - v_stock_before));

    -- Verify audit log entry
    FOR r IN (
        SELECT description, changed_at
        FROM   audit_log
        WHERE  table_name = 'ORDERS' AND record_id = v_oid
        ORDER  BY log_id DESC
        FETCH FIRST 1 ROW ONLY
    ) LOOP
        DBMS_OUTPUT.PUT_LINE('Audit: ' || r.DESCRIPTION);
    END LOOP;
END;
/

-- ============================================================
-- STEP 7: FUNCTION DEMO — Compatibility + Validation Functions
-- Demonstrates scalar functions returning values.
-- ============================================================

PROMPT ============================================================
PROMPT STEP 7: Functions — Compatibility & Validation
PROMPT ============================================================

-- 7a. check_compatibility: Betta vs Neon Tetra setup (using Emma's demo setup)
DECLARE
    v_setup  NUMBER;
    v_betta  NUMBER;
    v_neon   NUMBER;
    v_result NUMBER;
BEGIN
    SELECT setup_id INTO v_setup FROM aquarium_setups
    WHERE  setup_name = 'Community Freshwater Garden'
    FETCH FIRST 1 ROW ONLY;

    SELECT product_id INTO v_betta FROM products WHERE product_name = 'Betta Splendens (Male)';
    SELECT product_id INTO v_neon  FROM products WHERE product_name = 'Neon Tetra';

    v_result := check_compatibility(v_setup, v_betta);
    DBMS_OUTPUT.PUT_LINE('Compatibility conflicts if Betta added: ' || v_result);
    -- Expects 0 (Betta vs existing Corydoras/Guppies — Guppy conflict = 1!)

    v_result := validate_tank_capacity(v_setup);
    DBMS_OUTPUT.PUT_LINE('Tank capacity check (1=OK, 0=fail): ' || v_result);

    v_result := validate_water_type(v_setup);
    DBMS_OUTPUT.PUT_LINE('Water type check (1=OK, 0=fail): ' || v_result);

    v_result := validate_temperature(v_setup);
    DBMS_OUTPUT.PUT_LINE('Temperature check (1=OK, 0=fail): ' || v_result);

    DBMS_OUTPUT.PUT_LINE('Setup price: $' || get_setup_total_price(v_setup));
END;
/

-- 7b. check_availability for a specific product
DECLARE
    v_pid    NUMBER;
    v_avail  NUMBER;
BEGIN
    SELECT product_id INTO v_pid FROM products WHERE product_name = 'Neon Tetra';
    v_avail := check_availability(v_pid, 50);
    DBMS_OUTPUT.PUT_LINE('Can fill order of 50 Neon Tetras? ' || CASE v_avail WHEN 1 THEN 'YES' ELSE 'NO' END);
    v_avail := check_availability(v_pid, 9999);
    DBMS_OUTPUT.PUT_LINE('Can fill order of 9999 Neon Tetras? ' || CASE v_avail WHEN 1 THEN 'YES' ELSE 'NO' END);
END;
/

-- ============================================================
-- STEP 8: VIEW DEMO — vw_dashboard_kpis
-- Single FROM DUAL query that pulls 10+ live KPIs.
-- ============================================================

PROMPT ============================================================
PROMPT STEP 8: View — Dashboard KPIs (vw_dashboard_kpis)
PROMPT ============================================================

SELECT
    TOTAL_PRODUCTS,
    TOTAL_CUSTOMERS,
    TOTAL_SUPPLIERS,
    ORDERS_THIS_MONTH,
    REVENUE_THIS_MONTH,
    PENDING_ORDERS,
    ACTIVE_SETUPS,
    OPEN_LOW_STOCK_ALERTS
FROM vw_dashboard_kpis;

-- Inventory health summary
PROMPT --- Inventory health breakdown ---
SELECT stock_health, COUNT(*) AS product_count
FROM   vw_inventory_summary
GROUP  BY stock_health
ORDER  BY stock_health;

-- Low stock items
PROMPT --- Low stock / out of stock items ---
SELECT product_name, product_type, qty_on_hand, reorder_level, stock_health
FROM   vw_inventory_summary
WHERE  stock_health IN ('LOW_STOCK', 'OUT_OF_STOCK')
ORDER  BY qty_on_hand;

-- ============================================================
-- STEP 9: VIEW DEMO — Sales & Profit Analytics
-- ============================================================

PROMPT ============================================================
PROMPT STEP 9: Views — Sales & Profit Analytics
PROMPT ============================================================

-- Monthly sales
PROMPT --- Monthly Sales Summary ---
SELECT month_label, order_count, total_revenue, avg_order_value
FROM   vw_monthly_sales
ORDER  BY month_label;

-- Best-selling fish
PROMPT --- Best-Selling Fish ---
SELECT product_name, species_name, total_sold, total_revenue, order_count
FROM   vw_best_selling_fish
ORDER  BY total_sold DESC
FETCH FIRST 5 ROWS ONLY;

-- Customer tiers
PROMPT --- Customer Purchase Tiers ---
SELECT
    first_name || ' ' || last_name AS customer,
    total_orders,
    lifetime_value,
    customer_tier
FROM   vw_customer_purchase_history
ORDER  BY lifetime_value DESC NULLS LAST;

-- Profit analysis (per-order using calc_order_profit function)
PROMPT --- Profit Analysis (top 5 orders by profit) ---
SELECT order_id, customer_name, revenue, cogs, profit, margin_pct
FROM   vw_profit_analysis
ORDER  BY profit DESC NULLS LAST
FETCH FIRST 5 ROWS ONLY;

-- Fast movers (30 days)
PROMPT --- Fast Movers (last 30 days) ---
SELECT product_name, units_sold_30d, revenue_30d, order_count_30d
FROM   vw_fast_movers
ORDER  BY units_sold_30d DESC
FETCH FIRST 10 ROWS ONLY;

-- ============================================================
-- STEP 10: SUPPLIER PO LIFECYCLE
-- Full Demo: create PO → add items → submit → approve → receive
-- Stock levels checked before and after.
-- ============================================================

PROMPT ============================================================
PROMPT STEP 10: Supplier PO Lifecycle (End-to-End)
PROMPT ============================================================

DECLARE
    v_supp_id  NUMBER;
    v_po_id    NUMBER;
    v_neon_id  NUMBER;
    v_guppy_id NUMBER;
    v_stk_neon_before   NUMBER;
    v_stk_guppy_before  NUMBER;
    v_stk_neon_after    NUMBER;
    v_stk_guppy_after   NUMBER;
BEGIN
    SELECT supplier_id INTO v_supp_id  FROM suppliers WHERE supplier_name = 'FreshWater Direct';
    SELECT product_id  INTO v_neon_id  FROM products  WHERE product_name  = 'Neon Tetra';
    SELECT product_id  INTO v_guppy_id FROM products  WHERE product_name  = 'Guppy (Assorted)';

    -- Stock snapshot before PO
    SELECT qty_on_hand INTO v_stk_neon_before  FROM inventory WHERE product_id = v_neon_id;
    SELECT qty_on_hand INTO v_stk_guppy_before FROM inventory WHERE product_id = v_guppy_id;
    DBMS_OUTPUT.PUT_LINE('Stock BEFORE PO:');
    DBMS_OUTPUT.PUT_LINE('  Neon Tetra:        ' || v_stk_neon_before);
    DBMS_OUTPUT.PUT_LINE('  Guppy (Assorted):  ' || v_stk_guppy_before);

    -- Step 10a: Create PO (DRAFT)
    create_supplier_po(
        p_supplier_id => v_supp_id,
        p_notes       => 'Demo PO — monthly restock',
        p_created_by  => 1,
        p_po_id       => v_po_id
    );
    DBMS_OUTPUT.PUT_LINE('PO created (DRAFT): #' || v_po_id);

    -- Step 10b: Add items
    add_po_item(v_po_id, v_neon_id,  100, 1.00);
    add_po_item(v_po_id, v_guppy_id,  80, 0.80);
    DBMS_OUTPUT.PUT_LINE('Items added to PO');

    -- Show PO total (trigger trg_po_total_on_item_change auto-calculated it)
    FOR r IN (SELECT total_amount FROM supplier_po WHERE po_id = v_po_id) LOOP
        DBMS_OUTPUT.PUT_LINE('PO total (auto-calculated by trigger): $' || r.total_amount);
    END LOOP;

    -- Step 10c: Submit PO
    submit_supplier_po(v_po_id, 1);
    DBMS_OUTPUT.PUT_LINE('PO submitted (SUBMITTED)');

    -- Step 10d: Approve PO
    approve_supplier_po(v_po_id, 1);
    DBMS_OUTPUT.PUT_LINE('PO approved (APPROVED)');

    -- Step 10e: Receive PO — this calls update_inventory() and creates stock_batches
    receive_supplier_po(v_po_id, 1);
    DBMS_OUTPUT.PUT_LINE('PO received (RECEIVED) — stock updated');

    -- Stock snapshot after PO
    SELECT qty_on_hand INTO v_stk_neon_after  FROM inventory WHERE product_id = v_neon_id;
    SELECT qty_on_hand INTO v_stk_guppy_after FROM inventory WHERE product_id = v_guppy_id;
    DBMS_OUTPUT.PUT_LINE('Stock AFTER PO:');
    DBMS_OUTPUT.PUT_LINE('  Neon Tetra:        ' || v_stk_neon_after  || ' (+' || (v_stk_neon_after  - v_stk_neon_before)  || ')');
    DBMS_OUTPUT.PUT_LINE('  Guppy (Assorted):  ' || v_stk_guppy_after || ' (+' || (v_stk_guppy_after - v_stk_guppy_before) || ')');

    -- Show stock batches created
    FOR r IN (
        SELECT b.batch_id, p.product_name, b.quantity_received, b.unit_cost
        FROM   stock_batches b
        JOIN   products p ON b.product_id = p.product_id
        WHERE  b.po_id = v_po_id
    ) LOOP
        DBMS_OUTPUT.PUT_LINE(
            'Batch #' || r.BATCH_ID ||
            ' | ' || r.PRODUCT_NAME ||
            ' | Qty: ' || r.QUANTITY_RECEIVED ||
            ' | Cost: $' || r.UNIT_COST
        );
    END LOOP;
END;
/

PROMPT ============================================================
PROMPT DEMO COMPLETE — All 10 steps executed successfully.
PROMPT
PROMPT Summary of Oracle features demonstrated:
PROMPT   Tables:      15+ with constraints, FKs, CHECK, UNIQUE
PROMPT   Sequences:   18 auto-increment sequences
PROMPT   Procedures:  10+ PL/SQL stored procedures
PROMPT   Functions:   9 scalar functions
PROMPT   Triggers:    12 BEFORE/AFTER triggers (row-level)
PROMPT   Views:       15+ including analytics and KPI views
PROMPT   ACID:        Full commit/rollback in place_order & cancel_order
PROMPT   MERGE:       Cart upsert, setup items, customer cart creation
PROMPT   CURSOR:      FOR loops in supplier receive and validation
PROMPT   FOR UPDATE:  Row-level locking in update_inventory
PROMPT   SYS_CONTEXT: Username capture in audit_log trigger
PROMPT   RETURNING:   Auto-ID capture after INSERT in procedures
PROMPT ============================================================
